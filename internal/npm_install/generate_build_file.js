/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("build_bazel_rules_nodejs/internal/npm_install/generate_build_file", ["require", "exports", "fs", "path", "crypto"], factory);
    }
})(function (require, exports) {
    /**
     * @license
     * Copyright 2017 The Bazel Authors. All rights reserved.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     *
     * You may obtain a copy of the License at
     *     http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview This script generates BUILD.bazel files by analyzing
     * the node_modules folder layed out by yarn or npm. It generates
     * fine grained Bazel `node_module_library` targets for each root npm package
     * and all files for that package and its transitive deps are included
     * in the target. For example, `@<workspace>//jasmine` would
     * include all files in the jasmine npm package and all of its
     * transitive dependencies.
     *
     * nodejs_binary targets are also generated for all `bin` scripts
     * in each package. For example, the `@<workspace>//jasmine/bin:jasmine`
     * target will be generated for the `jasmine` binary in the `jasmine`
     * npm package.
     *
     * Additionally, a `@<workspace>//:node_modules` `node_module_library`
     * is generated that includes all packages under node_modules
     * as well as the .bin folder.
     *
     * This work is based off the fine grained deps concepts in
     * https://github.com/pubref/rules_node developed by @pcj.
     *
     * @see https://docs.google.com/document/d/1AfjHMLVyE_vYwlHSK7k7yW_IIGppSxsQtPm9PTr1xEo
     */
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs = require("fs");
    const path = require("path");
    const crypto = require("crypto");
    function log_verbose(...m) {
        if (!!process.env['VERBOSE_LOGS'])
            console.error('[generate_build_file.js]', ...m);
    }
    const BUILD_FILE_HEADER = `# Generated file from yarn_install/npm_install rule.
# See $(bazel info output_base)/external/build_bazel_rules_nodejs/internal/npm_install/generate_build_file.js

# All rules in other repositories can use these targets
package(default_visibility = ["//visibility:public"])

`;
    const args = process.argv.slice(2);
    const WORKSPACE = args[0];
    const RULE_TYPE = args[1];
    const ERROR_ON_BAZEL_FILES = parseInt(args[2]);
    const LOCK_FILE_PATH = args[3];
    const INCLUDED_FILES = args[4] ? args[4].split(',') : [];
    const DYNAMIC_DEPS = JSON.parse(args[5] || '{}');
    if (require.main === module) {
        main();
    }
    /**
     * Create a new directory and any necessary subdirectories
     * if they do not exist.
     */
    function mkdirp(p) {
        if (!fs.existsSync(p)) {
            mkdirp(path.dirname(p));
            fs.mkdirSync(p);
        }
    }
    /**
     * Writes a file, first ensuring that the directory to
     * write to exists.
     */
    function writeFileSync(p, content) {
        mkdirp(path.dirname(p));
        fs.writeFileSync(p, content);
    }
    /**
     * Main entrypoint.
     */
    function main() {
        // find all packages (including packages in nested node_modules)
        const pkgs = findPackages();
        // flatten dependencies
        flattenDependencies(pkgs);
        // generate Bazel workspaces
        generateBazelWorkspaces(pkgs);
        // generate all BUILD files
        generateBuildFiles(pkgs);
    }
    module.exports = {
        main,
        printPackageBin,
        addDynamicDependencies,
        printIndexBzl,
    };
    /**
     * Generates all build files
     */
    function generateBuildFiles(pkgs) {
        generateRootBuildFile(pkgs.filter(pkg => !pkg._isNested));
        pkgs.filter(pkg => !pkg._isNested).forEach(pkg => generatePackageBuildFiles(pkg));
        findScopes().forEach(scope => generateScopeBuildFiles(scope, pkgs));
    }
    /**
     * Flattens dependencies on all packages
     */
    function flattenDependencies(pkgs) {
        const pkgsMap = new Map();
        pkgs.forEach(pkg => pkgsMap.set(pkg._dir, pkg));
        pkgs.forEach(pkg => flattenPkgDependencies(pkg, pkg, pkgsMap));
    }
    /**
     * Handles Bazel files in npm distributions.
     */
    function hideBazelFiles(pkg) {
        const hasHideBazelFiles = isDirectory('node_modules/@bazel/hide-bazel-files');
        pkg._files = pkg._files.map(file => {
            const basename = path.basename(file);
            const basenameUc = basename.toUpperCase();
            if (basenameUc === 'BUILD' || basenameUc === 'BUILD.BAZEL') {
                // If bazel files are detected and there is no @bazel/hide-bazel-files npm
                // package then error out and suggest adding the package. It is possible to
                // have bazel BUILD files with the package installed as it's postinstall
                // step, which hides bazel BUILD files, only runs when the @bazel/hide-bazel-files
                // is installed and not when new packages are added (via `yarn add`
                // for example) after the initial install. In this case, however, the repo rule
                // will re-run as the package.json && lock file has changed so we just
                // hide the added BUILD files during the repo rule run here since @bazel/hide-bazel-files
                // was not run.
                if (!hasHideBazelFiles && ERROR_ON_BAZEL_FILES) {
                    console.error(`npm package '${pkg._dir}' from @${WORKSPACE} ${RULE_TYPE} rule
has a Bazel BUILD file '${file}'. Use the @bazel/hide-bazel-files utility to hide these files.
See https://github.com/bazelbuild/rules_nodejs/blob/master/packages/hide-bazel-files/README.md
for installation instructions.`);
                    process.exit(1);
                }
                else {
                    // All Bazel files in the npm distribution should be renamed by
                    // adding a `_` prefix so that file targets don't cross package boundaries.
                    const newFile = path.posix.join(path.dirname(file), `_${basename}`);
                    const srcPath = path.posix.join('node_modules', pkg._dir, file);
                    const dstPath = path.posix.join('node_modules', pkg._dir, newFile);
                    fs.renameSync(srcPath, dstPath);
                    return newFile;
                }
            }
            return file;
        });
    }
    /**
     * Generates the root BUILD file.
     */
    function generateRootBuildFile(pkgs) {
        let exportsStarlark = '';
        pkgs.forEach(pkg => {
            pkg._files.forEach(f => {
                exportsStarlark += `    "node_modules/${pkg._dir}/${f}",
`;
            });
        });
        let srcsStarlark = '';
        if (pkgs.length) {
            const list = pkgs.map(pkg => `"//${pkg._dir}:${pkg._name}__files",`).join('\n        ');
            srcsStarlark = `
    # direct sources listed for strict deps support
    srcs = [
        ${list}
    ],`;
        }
        let depsStarlark = '';
        if (pkgs.length) {
            const list = pkgs.map(pkg => `"//${pkg._dir}:${pkg._name}__contents",`).join('\n        ');
            depsStarlark = `
    # flattened list of direct and transitive dependencies hoisted to root by the package manager
    deps = [
        ${list}
    ],`;
        }
        let buildFile = BUILD_FILE_HEADER +
            `load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

exports_files([
${exportsStarlark}])

# The node_modules directory in one catch-all node_module_library.
# NB: Using this target may have bad performance implications if
# there are many files in target.
# See https://github.com/bazelbuild/bazel/issues/5153.
node_module_library(
    name = "node_modules",${srcsStarlark}${depsStarlark}
)

`;
        // Add the manual build file contents if they exists
        try {
            buildFile += fs.readFileSync(`manual_build_file_contents`, { encoding: 'utf8' });
        }
        catch (e) {
        }
        writeFileSync('BUILD.bazel', buildFile);
    }
    /**
     * Generates all BUILD & bzl files for a package.
     */
    function generatePackageBuildFiles(pkg) {
        let buildFile = printPackage(pkg);
        const binBuildFile = printPackageBin(pkg);
        if (binBuildFile.length) {
            writeFileSync(path.posix.join(pkg._dir, 'bin', 'BUILD.bazel'), BUILD_FILE_HEADER + binBuildFile);
        }
        const indexFile = printIndexBzl(pkg);
        if (indexFile.length) {
            writeFileSync(path.posix.join(pkg._dir, 'index.bzl'), indexFile);
            buildFile = `${buildFile}
# For integration testing
exports_files(["index.bzl"])
`;
        }
        writeFileSync(path.posix.join(pkg._dir, 'BUILD.bazel'), BUILD_FILE_HEADER + buildFile);
    }
    /**
     * Generate install_<workspace_name>.bzl files with function to install each workspace.
     */
    function generateBazelWorkspaces(pkgs) {
        const workspaces = {};
        for (const pkg of pkgs) {
            if (!pkg.bazelWorkspaces) {
                continue;
            }
            for (const workspace of Object.keys(pkg.bazelWorkspaces)) {
                // A bazel workspace can only be setup by one npm package
                if (workspaces[workspace]) {
                    console.error(`Could not setup Bazel workspace ${workspace} requested by npm ` +
                        `package ${pkg._dir}@${pkg.version}. Already setup by ${workspaces[workspace]}`);
                    process.exit(1);
                }
                generateBazelWorkspace(pkg, workspace);
                // Keep track of which npm package setup this bazel workspace for later use
                workspaces[workspace] = `${pkg._dir}@${pkg.version}`;
            }
        }
        // Finally generate install_bazel_dependencies.bzl
        generateInstallBazelDependencies(Object.keys(workspaces));
    }
    /**
     * Generate install_<workspace>.bzl file with function to install the workspace.
     */
    function generateBazelWorkspace(pkg, workspace) {
        let bzlFile = `# Generated by the yarn_install/npm_install rule
load("@build_bazel_rules_nodejs//internal/copy_repository:copy_repository.bzl", "copy_repository")

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
`;
        const rootPath = pkg.bazelWorkspaces[workspace].rootPath;
        if (!rootPath) {
            console.error(`Malformed bazelWorkspaces attribute in ${pkg._dir}@${pkg.version}. ` +
                `Missing rootPath for workspace ${workspace}.`);
            process.exit(1);
        }
        // Copy all files for this workspace to a folder under _workspaces
        // to restore the Bazel files which have be renamed from the npm package
        const workspaceSourcePath = path.posix.join('_workspaces', workspace);
        mkdirp(workspaceSourcePath);
        pkg._files.forEach(file => {
            if (/^node_modules[/\\]/.test(file)) {
                // don't copy over nested node_modules
                return;
            }
            let destFile = path.relative(rootPath, file);
            if (destFile.startsWith('..')) {
                // this file is not under the rootPath
                return;
            }
            const basename = path.basename(file);
            const basenameUc = basename.toUpperCase();
            // Bazel BUILD files from npm distribution would have been renamed earlier with a _ prefix so
            // we restore the name on the copy
            if (basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL') {
                destFile = path.posix.join(path.dirname(destFile), basename.substr(1));
            }
            const src = path.posix.join('node_modules', pkg._dir, file);
            const dest = path.posix.join(workspaceSourcePath, destFile);
            mkdirp(path.dirname(dest));
            fs.copyFileSync(src, dest);
        });
        // We create _bazel_workspace_marker that is used by the custom copy_repository
        // rule to resolve the path to the repository source root. A root BUILD file
        // is required to reference _bazel_workspace_marker as a target so we also create
        // an empty one if one does not exist.
        if (!hasRootBuildFile(pkg, rootPath)) {
            writeFileSync(path.posix.join(workspaceSourcePath, 'BUILD.bazel'), '# Marker file that this directory is a bazel package');
        }
        const sha256sum = crypto.createHash('sha256');
        sha256sum.update(fs.readFileSync(LOCK_FILE_PATH, { encoding: 'utf8' }));
        writeFileSync(path.posix.join(workspaceSourcePath, '_bazel_workspace_marker'), `# Marker file to used by custom copy_repository rule\n${sha256sum.digest('hex')}`);
        bzlFile += `def install_${workspace}():
    _maybe(
        copy_repository,
        name = "${workspace}",
        marker_file = "@${WORKSPACE}//_workspaces/${workspace}:_bazel_workspace_marker",
    )
`;
        writeFileSync(`install_${workspace}.bzl`, bzlFile);
    }
    /**
     * Generate install_bazel_dependencies.bzl with function to install all workspaces.
     */
    function generateInstallBazelDependencies(workspaces) {
        let bzlFile = `# Generated by the yarn_install/npm_install rule
`;
        workspaces.forEach(workspace => {
            bzlFile += `load(\":install_${workspace}.bzl\", \"install_${workspace}\")
`;
        });
        bzlFile += `def install_bazel_dependencies():
    """Installs all workspaces listed in bazelWorkspaces of all npm packages"""
`;
        workspaces.forEach(workspace => {
            bzlFile += `    install_${workspace}()
`;
        });
        writeFileSync('install_bazel_dependencies.bzl', bzlFile);
    }
    /**
     * Generate build files for a scope.
     */
    function generateScopeBuildFiles(scope, pkgs) {
        const buildFile = BUILD_FILE_HEADER + printScope(scope, pkgs);
        writeFileSync(path.posix.join(scope, 'BUILD.bazel'), buildFile);
    }
    /**
     * Checks if a path is a file.
     */
    function isFile(p) {
        return fs.existsSync(p) && fs.statSync(p).isFile();
    }
    /**
     * Checks if a path is an npm package which is is a directory with a package.json file.
     */
    function isDirectory(p) {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
    }
    /**
     * Returns an array of all the files under a directory as relative
     * paths to the directory.
     */
    function listFiles(rootDir, subDir = '') {
        const dir = path.posix.join(rootDir, subDir);
        if (!isDirectory(dir)) {
            return [];
        }
        return fs.readdirSync(dir)
            .reduce((files, file) => {
            const fullPath = path.posix.join(dir, file);
            const relPath = path.posix.join(subDir, file);
            const isSymbolicLink = fs.lstatSync(fullPath).isSymbolicLink();
            let stat;
            try {
                stat = fs.statSync(fullPath);
            }
            catch (e) {
                if (isSymbolicLink) {
                    // Filter out broken symbolic links. These cause fs.statSync(fullPath)
                    // to fail with `ENOENT: no such file or directory ...`
                    return files;
                }
                throw e;
            }
            const isDirectory = stat.isDirectory();
            if (isDirectory && isSymbolicLink) {
                // Filter out symbolic links to directories. An issue in yarn versions
                // older than 1.12.1 creates symbolic links to folders in the .bin folder
                // which leads to Bazel targets that cross package boundaries.
                // See https://github.com/bazelbuild/rules_nodejs/issues/428 and
                // https://github.com/bazelbuild/rules_nodejs/issues/438.
                // This is tested in /e2e/fine_grained_symlinks.
                return files;
            }
            return isDirectory ? files.concat(listFiles(rootDir, relPath)) : files.concat(relPath);
        }, [])
            // Files with spaces (\x20) or unicode characters (<\x20 && >\x7E) are not allowed in
            // Bazel runfiles. See https://github.com/bazelbuild/bazel/issues/4327
            .filter(f => !/[^\x21-\x7E]/.test(f))
            // We return a sorted array so that the order of files
            // is the same regardless of platform
            .sort();
    }
    /**
     * Returns true if the npm package distribution contained a
     * root /BUILD or /BUILD.bazel file.
     */
    function hasRootBuildFile(pkg, rootPath) {
        for (const file of pkg._files) {
            // Bazel files would have been renamed earlier with a `_` prefix
            const fileUc = path.relative(rootPath, file).toUpperCase();
            if (fileUc === '_BUILD' || fileUc === '_BUILD.BAZEL') {
                return true;
            }
        }
        return false;
    }
    function addDynamicDependencies(pkgs, dynamic_deps = DYNAMIC_DEPS) {
        function match(name, p) {
            // Automatically include dynamic dependency on plugins of the form pkg-plugin-foo
            if (name.startsWith(`${p._moduleName}-plugin-`))
                return true;
            const value = dynamic_deps[p._moduleName];
            if (name === value)
                return true;
            // Support wildcard match
            if (value && value.includes('*') && name.startsWith(value.substring(0, value.indexOf('*')))) {
                return true;
            }
            return false;
        }
        pkgs.forEach(p => {
            p._dynamicDependencies =
                pkgs.filter(
                // Filter entries like
                // "_dir":"check-side-effects/node_modules/rollup-plugin-node-resolve"
                x => !x._dir.includes('/node_modules/') && !!x._moduleName &&
                    match(x._moduleName, p))
                    .map(dyn => `//${dyn._dir}:${dyn._name}`);
        });
    }
    /**
     * Finds and returns an array of all packages under a given path.
     */
    function findPackages(p = 'node_modules') {
        if (!isDirectory(p)) {
            return [];
        }
        const pkgs = [];
        const listing = fs.readdirSync(p);
        const packages = listing
            // filter out scopes
            .filter(f => !f.startsWith('@'))
            // filter out folders such as `.bin` which can create
            // issues on Windows since these are "hidden" by default
            .filter(f => !f.startsWith('.'))
            .map(f => path.posix.join(p, f))
            .filter(f => isDirectory(f));
        packages.forEach(f => pkgs.push(parsePackage(f), ...findPackages(path.posix.join(f, 'node_modules'))));
        const scopes = listing.filter(f => f.startsWith('@'))
            .map(f => path.posix.join(p, f))
            .filter(f => isDirectory(f));
        scopes.forEach(f => pkgs.push(...findPackages(f)));
        addDynamicDependencies(pkgs);
        return pkgs;
    }
    /**
     * Finds and returns an array of all package scopes in node_modules.
     */
    function findScopes() {
        const p = 'node_modules';
        if (!isDirectory(p)) {
            return [];
        }
        const listing = fs.readdirSync(p);
        const scopes = listing.filter(f => f.startsWith('@'))
            .map(f => path.posix.join(p, f))
            .filter(f => isDirectory(f))
            .map(f => f.replace(/^node_modules\//, ''));
        return scopes;
    }
    /**
     * Given the name of a top-level folder in node_modules, parse the
     * package json and return it as an object along with
     * some additional internal attributes prefixed with '_'.
     */
    function parsePackage(p) {
        // Parse the package.json file of this package
        const packageJson = path.posix.join(p, 'package.json');
        const pkg = isFile(packageJson) ? JSON.parse(fs.readFileSync(packageJson, { encoding: 'utf8' })) :
            { version: '0.0.0' };
        // Trim the leading node_modules from the path and
        // assign to _dir for future use
        pkg._dir = p.replace(/^node_modules\//, '');
        // Stash the package directory name for future use
        pkg._name = pkg._dir.split('/').pop();
        // Module name of the package. Unlike "_name" this represents the
        // full package name (including scope name).
        pkg._moduleName = pkg.name || `${pkg._dir}/${pkg._name}`;
        // Keep track of whether or not this is a nested package
        pkg._isNested = /\/node_modules\//.test(p);
        // List all the files in the npm package for later use
        pkg._files = listFiles(p);
        // Initialize _dependencies to an empty array
        // which is later filled with the flattened dependency list
        pkg._dependencies = [];
        // Hide bazel files in this package. We do this before parsing
        // the next package to prevent issues caused by symlinks between
        // package and nested packages setup by the package manager.
        hideBazelFiles(pkg);
        return pkg;
    }
    /**
     * Check if a bin entry is a non-empty path
     */
    function isValidBinPath(entry) {
        return isValidBinPathStringValue(entry) || isValidBinPathObjectValues(entry);
    }
    /**
     * If given a string, check if a bin entry is a non-empty path
     */
    function isValidBinPathStringValue(entry) {
        return typeof entry === 'string' && entry !== '';
    }
    /**
     * If given an object literal, check if a bin entry objects has at least one a non-empty path
     * Example 1: { entry: './path/to/script.js' } ==> VALID
     * Example 2: { entry: '' } ==> INVALID
     * Example 3: { entry: './path/to/script.js', empty: '' } ==> VALID
     */
    function isValidBinPathObjectValues(entry) {
        // We allow at least one valid entry path (if any).
        return entry && typeof entry === 'object' &&
            Object['values'](entry).filter(_entry => isValidBinPath(_entry)).length > 0;
    }
    /**
     * Cleanup a package.json "bin" path.
     *
     * Bin paths usually come in 2 flavors: './bin/foo' or 'bin/foo',
     * sometimes other stuff like 'lib/foo'.  Remove prefix './' if it
     * exists.
     */
    function cleanupBinPath(p) {
        p = p.replace(/\\/g, '/');
        if (p.indexOf('./') === 0) {
            p = p.slice(2);
        }
        return p;
    }
    /**
     * Cleanup a package.json entry point such as "main"
     *
     * Removes './' if it exists.
     * Appends `index.js` if p ends with `/`.
     */
    function cleanupEntryPointPath(p) {
        p = p.replace(/\\/g, '/');
        if (p.indexOf('./') === 0) {
            p = p.slice(2);
        }
        if (p.endsWith('/')) {
            p += 'index.js';
        }
        return p;
    }
    /**
     * Cleans up the given path
     * Then tries to resolve the path into a file and warns if VERBOSE_LOGS set and the file dosen't
     * exist
     * @param {any} pkg
     * @param {string} path
     * @returns {string | undefined}
     */
    function findEntryFile(pkg, path) {
        const cleanPath = cleanupEntryPointPath(path);
        // check if main entry point exists
        const entryFile = findFile(pkg, cleanPath) || findFile(pkg, `${cleanPath}.js`);
        if (!entryFile) {
            // If entryPoint entry point listed could not be resolved to a file
            // This can happen
            // in some npm packages that list an incorrect main such as v8-coverage@1.0.8
            // which lists `"main": "index.js"` but that file does not exist.
            log_verbose(`could not find entry point for the path ${cleanPath} given by npm package ${pkg._name}`);
        }
        return entryFile;
    }
    /**
     * Tries to resolve the entryPoint file from the pkg for a given mainFileName
     *
     * @param {any} pkg
     * @param {'browser' | 'module' | 'main'} mainFileName
     * @returns {string | undefined} the path or undefined if we cant resolve the file
     */
    function resolveMainFile(pkg, mainFileName) {
        const mainEntryField = pkg[mainFileName];
        if (mainEntryField) {
            if (typeof mainEntryField === 'string') {
                return findEntryFile(pkg, mainEntryField);
            }
            else if (typeof mainEntryField === 'object' && mainFileName === 'browser') {
                // browser has a weird way of defining this
                // the browser value is an object listing files to alias, usually pointing to a browser dir
                const indexEntryPoint = mainEntryField['index.js'] || mainEntryField['./index.js'];
                if (indexEntryPoint) {
                    return findEntryFile(pkg, indexEntryPoint);
                }
            }
        }
    }
    /**
     * Tries to resolve the mainFile from a given pkg
     * This uses seveal mainFileNames in priority to find a correct usable file
     * @param {any} pkg
     * @returns {string | undefined}
     */
    function resolvePkgMainFile(pkg) {
        // es2015 is another option for mainFile here
        // but its very uncommon and im not sure what priority it takes
        //
        // this list is ordered, we try resolve `browser` first, then `module` and finally fall back to
        // `main`
        const mainFileNames = ['browser', 'module', 'main'];
        for (const mainFile of mainFileNames) {
            const resolvedMainFile = resolveMainFile(pkg, mainFile);
            if (resolvedMainFile) {
                return resolvedMainFile;
            }
        }
        // if we cant find any correct file references from the pkg
        // then we just try looking around for common patterns
        const maybeRootIndex = findEntryFile(pkg, 'index.js');
        if (maybeRootIndex) {
            return maybeRootIndex;
        }
        const maybeSelfNamedIndex = findEntryFile(pkg, `${pkg._name}.js`);
        if (maybeSelfNamedIndex) {
            return maybeSelfNamedIndex;
        }
        // none of the methods we tried resulted in a file
        log_verbose(`could not find entry point for npm package ${pkg._name}`);
        // at this point there's nothing left for us to try, so return nothing
        return undefined;
    }
    /**
     * Flattens all transitive dependencies of a package
     * into a _dependencies array.
     */
    function flattenPkgDependencies(pkg, dep, pkgsMap) {
        if (pkg._dependencies.indexOf(dep) !== -1) {
            // circular dependency
            return;
        }
        pkg._dependencies.push(dep);
        const findDeps = function (targetDeps, required, depType) {
            Object.keys(targetDeps || {})
                .map(targetDep => {
                // look for matching nested package
                const dirSegments = dep._dir.split('/');
                while (dirSegments.length) {
                    const maybe = path.posix.join(...dirSegments, 'node_modules', targetDep);
                    if (pkgsMap.has(maybe)) {
                        return pkgsMap.get(maybe);
                    }
                    dirSegments.pop();
                }
                // look for matching root package
                if (pkgsMap.has(targetDep)) {
                    return pkgsMap.get(targetDep);
                }
                // dependency not found
                if (required) {
                    console.error(`could not find ${depType} '${targetDep}' of '${dep._dir}'`);
                    process.exit(1);
                }
                return null;
            })
                .filter(dep => !!dep)
                .forEach(dep => flattenPkgDependencies(pkg, dep, pkgsMap));
        };
        // npm will in some cases add optionalDependencies to the list
        // of dependencies to the package.json it writes to node_modules.
        // We delete these here if they exist as they may result
        // in expected dependencies that are not found.
        if (dep.dependencies && dep.optionalDependencies) {
            Object.keys(dep.optionalDependencies).forEach(optionalDep => {
                delete dep.dependencies[optionalDep];
            });
        }
        findDeps(dep.dependencies, true, 'dependency');
        findDeps(dep.peerDependencies, true, 'peer dependency');
        // `optionalDependencies` that are missing should be silently
        // ignored since the npm/yarn will not fail if these dependencies
        // fail to install. Packages should handle the cases where these
        // dependencies are missing gracefully at runtime.
        // An example of this is the `chokidar` package which specifies
        // `fsevents` as an optionalDependency. On OSX, `fsevents`
        // is installed successfully, but on Windows & Linux, `fsevents`
        // fails to install and the package will not be present when
        // checking the dependencies of `chokidar`.
        findDeps(dep.optionalDependencies, false, 'optional dependency');
    }
    /**
     * Reformat/pretty-print a json object as a skylark comment (each line
     * starts with '# ').
     */
    function printJson(pkg) {
        // Clone and modify _dependencies to avoid circular issues when JSONifying
        // & delete _files array
        const cloned = Object.assign({}, pkg);
        cloned._dependencies = pkg._dependencies.map(dep => dep._dir);
        delete cloned._files;
        return JSON.stringify(cloned, null, 2).split('\n').map(line => `# ${line}`).join('\n');
    }
    /**
     * A filter function for files in an npm package. Comparison is case-insensitive.
     * @param files array of files to filter
     * @param exts list of white listed case-insensitive extensions; if empty, no filter is
     *             done on extensions; '' empty string denotes to allow files with no extensions,
     *             other extensions are listed with '.ext' notation such as '.d.ts'.
     */
    function filterFiles(files, exts = []) {
        if (exts.length) {
            const allowNoExts = exts.includes('');
            files = files.filter(f => {
                // include files with no extensions if noExt is true
                if (allowNoExts && !path.extname(f))
                    return true;
                // filter files in exts
                const lc = f.toLowerCase();
                for (const e of exts) {
                    if (e && lc.endsWith(e.toLowerCase())) {
                        return true;
                    }
                }
                return false;
            });
        }
        // Filter out BUILD files that came with the npm package
        return files.filter(file => {
            const basenameUc = path.basename(file).toUpperCase();
            if (basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL') {
                return false;
            }
            return true;
        });
    }
    /**
     * Returns true if the specified `pkg` conforms to Angular Package Format (APF),
     * false otherwise. If the package contains `*.metadata.json` and a
     * corresponding sibling `.d.ts` file, then the package is considered to be APF.
     */
    function isNgApfPackage(pkg) {
        const set = new Set(pkg._files);
        if (set.has('ANGULAR_PACKAGE')) {
            // This file is used by the npm/yarn_install rule to detect APF. See
            // https://github.com/bazelbuild/rules_nodejs/issues/927
            return true;
        }
        const metadataExt = /\.metadata\.json$/;
        return pkg._files.some((file) => {
            if (metadataExt.test(file)) {
                const sibling = file.replace(metadataExt, '.d.ts');
                if (set.has(sibling)) {
                    return true;
                }
            }
            return false;
        });
    }
    /**
     * If the package is in the Angular package format returns list
     * of package files that end with `.umd.js`, `.ngfactory.js` and `.ngsummary.js`.
     */
    function getNgApfScripts(pkg) {
        return isNgApfPackage(pkg) ?
            filterFiles(pkg._files, ['.umd.js', '.ngfactory.js', '.ngsummary.js']) :
            [];
    }
    /**
     * Looks for a file within a package and returns it if found.
     */
    function findFile(pkg, m) {
        const ml = m.toLowerCase();
        for (const f of pkg._files) {
            if (f.toLowerCase() === ml) {
                return f;
            }
        }
        return undefined;
    }
    /**
     * Given a pkg, return the skylark `node_module_library` targets for the package.
     */
    function printPackage(pkg) {
        const sources = filterFiles(pkg._files, INCLUDED_FILES);
        const dtsSources = filterFiles(pkg._files, ['.d.ts']);
        // TODO(gmagolan): add UMD & AMD scripts to scripts even if not an APF package _but_ only if they
        // are named?
        const scripts = getNgApfScripts(pkg);
        const deps = [pkg].concat(pkg._dependencies.filter(dep => dep !== pkg && !dep._isNested));
        let scriptStarlark = '';
        if (scripts.length) {
            scriptStarlark = `
    # subset of srcs that are javascript named-UMD or named-AMD scripts
    scripts = [
        ${scripts.map((f) => `"//:node_modules/${pkg._dir}/${f}",`).join('\n        ')}
    ],`;
        }
        let srcsStarlark = '';
        if (sources.length) {
            srcsStarlark = `
    # ${pkg._dir} package files (and files in nested node_modules)
    srcs = [
        ${sources.map((f) => `"//:node_modules/${pkg._dir}/${f}",`).join('\n        ')}
    ],`;
        }
        let depsStarlark = '';
        if (deps.length) {
            const list = deps.map(dep => `"//${dep._dir}:${dep._name}__contents",`).join('\n        ');
            depsStarlark = `
    # flattened list of direct and transitive dependencies hoisted to root by the package manager
    deps = [
        ${list}
    ],`;
        }
        let dtsStarlark = '';
        if (dtsSources.length) {
            dtsStarlark = `
    # ${pkg._dir} package declaration files (and declaration files in nested node_modules)
    srcs = [
        ${dtsSources.map(f => `"//:node_modules/${pkg._dir}/${f}",`).join('\n        ')}
    ],`;
        }
        let result = `load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

# Generated targets for npm package "${pkg._dir}"
${printJson(pkg)}

filegroup(
    name = "${pkg._name}__files",${srcsStarlark}
)

node_module_library(
    name = "${pkg._name}",
    # direct sources listed for strict deps support
    srcs = [":${pkg._name}__files"],${depsStarlark}
)

# ${pkg._name}__contents target is used as dep for main targets to prevent
# circular dependencies errors
node_module_library(
    name = "${pkg._name}__contents",
    srcs = [":${pkg._name}__files"],${scriptStarlark}
)

# ${pkg._name}__typings is the subset of ${pkg._name}__contents that are declarations
node_module_library(
    name = "${pkg._name}__typings",${dtsStarlark}
)

`;
        let mainEntryPoint = resolvePkgMainFile(pkg);
        // add an `npm_umd_bundle` target to generate an UMD bundle if one does
        // not exists
        if (mainEntryPoint && !findFile(pkg, `${pkg._name}.umd.js`)) {
            result +=
                `load("@build_bazel_rules_nodejs//internal/npm_install:npm_umd_bundle.bzl", "npm_umd_bundle")

npm_umd_bundle(
    name = "${pkg._name}__umd",
    package_name = "${pkg._name}",
    entry_point = "//:node_modules/${pkg._dir}/${mainEntryPoint}",
    package = ":${pkg._name}",
)

`;
        }
        return result;
    }
    function _findExecutables(pkg) {
        const executables = new Map();
        // For root packages, transform the pkg.bin entries
        // into a new Map called _executables
        // NOTE: we do this only for non-empty bin paths
        if (isValidBinPath(pkg.bin)) {
            if (!pkg._isNested) {
                if (Array.isArray(pkg.bin)) {
                    if (pkg.bin.length == 1) {
                        executables.set(pkg._dir, cleanupBinPath(pkg.bin[0]));
                    }
                    else {
                        // should not happen, but ignore it if present
                    }
                }
                else if (typeof pkg.bin === 'string') {
                    executables.set(pkg._dir, cleanupBinPath(pkg.bin));
                }
                else if (typeof pkg.bin === 'object') {
                    for (let key in pkg.bin) {
                        if (isValidBinPathStringValue(pkg.bin[key])) {
                            executables.set(key, cleanupBinPath(pkg.bin[key]));
                        }
                    }
                }
            }
        }
        return executables;
    }
    // Handle additionalAttributes of format:
    // ```
    // "bazelBin": {
    //   "ngc-wrapped": {
    //     "additionalAttributes": {
    //       "configuration_env_vars": "[\"compile\"]"
    //   }
    // },
    // ```
    function additionalAttributes(pkg, name) {
        let additionalAttributes = '';
        if (pkg.bazelBin && pkg.bazelBin[name] && pkg.bazelBin[name].additionalAttributes) {
            const attrs = pkg.bazelBin[name].additionalAttributes;
            for (const attrName of Object.keys(attrs)) {
                const attrValue = attrs[attrName];
                additionalAttributes += `\n    ${attrName} = ${attrValue},`;
            }
        }
        return additionalAttributes;
    }
    /**
     * Given a pkg, return the skylark nodejs_binary targets for the package.
     */
    function printPackageBin(pkg) {
        let result = '';
        const executables = _findExecutables(pkg);
        if (executables.size) {
            result = `load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

`;
            const data = [`//${pkg._dir}:${pkg._name}`];
            if (pkg._dynamicDependencies) {
                data.push(...pkg._dynamicDependencies);
            }
            for (const [name, path] of executables.entries()) {
                result += `# Wire up the \`bin\` entry \`${name}\`
nodejs_binary(
    name = "${name}",
    entry_point = "//:node_modules/${pkg._dir}/${path}",
    install_source_map_support = False,
    data = [${data.map(p => `"${p}"`).join(', ')}],${additionalAttributes(pkg, name)}
)

`;
            }
        }
        return result;
    }
    function printIndexBzl(pkg) {
        let result = '';
        const executables = _findExecutables(pkg);
        if (executables.size) {
            result = `load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "npm_package_bin")

`;
            const data = [`@${WORKSPACE}//${pkg._dir}:${pkg._name}`];
            if (pkg._dynamicDependencies) {
                data.push(...pkg._dynamicDependencies);
            }
            for (const [name, path] of executables.entries()) {
                result = `${result}

# Generated helper macro to call ${name}
def ${name.replace(/-/g, '_')}(**kwargs):
    output_dir = kwargs.pop("output_dir", False)
    if "outs" in kwargs or output_dir:
        npm_package_bin(tool = "@${WORKSPACE}//${pkg._dir}/bin:${name}", output_dir = output_dir, **kwargs)
    else:
        nodejs_binary(
            entry_point = "@${WORKSPACE}//:node_modules/${pkg._dir}/${path}",
            install_source_map_support = False,
            data = [${data.map(p => `"${p}"`).join(', ')}] + kwargs.pop("data", []),${additionalAttributes(pkg, name)}
            **kwargs
        )
  `;
            }
        }
        return result;
    }
    /**
     * Given a scope, return the skylark `node_module_library` target for the scope.
     */
    function printScope(scope, pkgs) {
        pkgs = pkgs.filter(pkg => !pkg._isNested && pkg._dir.startsWith(`${scope}/`));
        let deps = [];
        pkgs.forEach(pkg => {
            deps = deps.concat(pkg._dependencies.filter(dep => !dep._isNested && !pkgs.includes(pkg)));
        });
        // filter out duplicate deps
        deps = [...pkgs, ...new Set(deps)];
        let srcsStarlark = '';
        if (deps.length) {
            const list = deps.map(dep => `"//${dep._dir}:${dep._name}__files",`).join('\n        ');
            srcsStarlark = `
    # direct sources listed for strict deps support
    srcs = [
        ${list}
    ],`;
        }
        let depsStarlark = '';
        if (deps.length) {
            const list = deps.map(dep => `"//${dep._dir}:${dep._name}__contents",`).join('\n        ');
            depsStarlark = `
    # flattened list of direct and transitive dependencies hoisted to root by the package manager
    deps = [
        ${list}
    ],`;
        }
        return `load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

# Generated target for npm scope ${scope}
node_module_library(
    name = "${scope}",${srcsStarlark}${depsStarlark}
)

`;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVfYnVpbGRfZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL25wbV9pbnN0YWxsL2dlbmVyYXRlX2J1aWxkX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0lBQUE7Ozs7Ozs7Ozs7Ozs7OztPQWVHO0lBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDSCxZQUFZLENBQUM7O0lBR2IseUJBQXlCO0lBQ3pCLDZCQUE2QjtJQUM3QixpQ0FBaUM7SUFFakMsU0FBUyxXQUFXLENBQUMsR0FBRyxDQUFRO1FBQzlCLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCxNQUFNLGlCQUFpQixHQUFHOzs7Ozs7Q0FNekIsQ0FBQTtJQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUIsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3pELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFB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aWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBUaGUgQmF6ZWwgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICpcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQGZpbGVvdmVydmlldyBUaGlzIHNjcmlwdCBnZW5lcmF0ZXMgQlVJTEQuYmF6ZWwgZmlsZXMgYnkgYW5hbHl6aW5nXG4gKiB0aGUgbm9kZV9tb2R1bGVzIGZvbGRlciBsYXllZCBvdXQgYnkgeWFybiBvciBucG0uIEl0IGdlbmVyYXRlc1xuICogZmluZSBncmFpbmVkIEJhemVsIGBub2RlX21vZHVsZV9saWJyYXJ5YCB0YXJnZXRzIGZvciBlYWNoIHJvb3QgbnBtIHBhY2thZ2VcbiAqIGFuZCBhbGwgZmlsZXMgZm9yIHRoYXQgcGFja2FnZSBhbmQgaXRzIHRyYW5zaXRpdmUgZGVwcyBhcmUgaW5jbHVkZWRcbiAqIGluIHRoZSB0YXJnZXQuIEZvciBleGFtcGxlLCBgQDx3b3Jrc3BhY2U+Ly9qYXNtaW5lYCB3b3VsZFxuICogaW5jbHVkZSBhbGwgZmlsZXMgaW4gdGhlIGphc21pbmUgbnBtIHBhY2thZ2UgYW5kIGFsbCBvZiBpdHNcbiAqIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLlxuICpcbiAqIG5vZGVqc19iaW5hcnkgdGFyZ2V0cyBhcmUgYWxzbyBnZW5lcmF0ZWQgZm9yIGFsbCBgYmluYCBzY3JpcHRzXG4gKiBpbiBlYWNoIHBhY2thZ2UuIEZvciBleGFtcGxlLCB0aGUgYEA8d29ya3NwYWNlPi8vamFzbWluZS9iaW46amFzbWluZWBcbiAqIHRhcmdldCB3aWxsIGJlIGdlbmVyYXRlZCBmb3IgdGhlIGBqYXNtaW5lYCBiaW5hcnkgaW4gdGhlIGBqYXNtaW5lYFxuICogbnBtIHBhY2thZ2UuXG4gKlxuICogQWRkaXRpb25hbGx5LCBhIGBAPHdvcmtzcGFjZT4vLzpub2RlX21vZHVsZXNgIGBub2RlX21vZHVsZV9saWJyYXJ5YFxuICogaXMgZ2VuZXJhdGVkIHRoYXQgaW5jbHVkZXMgYWxsIHBhY2thZ2VzIHVuZGVyIG5vZGVfbW9kdWxlc1xuICogYXMgd2VsbCBhcyB0aGUgLmJpbiBmb2xkZXIuXG4gKlxuICogVGhpcyB3b3JrIGlzIGJhc2VkIG9mZiB0aGUgZmluZSBncmFpbmVkIGRlcHMgY29uY2VwdHMgaW5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9wdWJyZWYvcnVsZXNfbm9kZSBkZXZlbG9wZWQgYnkgQHBjai5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vZG9jcy5nb29nbGUuY29tL2RvY3VtZW50L2QvMUFmakhNTFZ5RV92WXdsSFNLN2s3eVdfSUlHcHBTeHNRdFBtOVBUcjF4RW9cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcblxuZnVuY3Rpb24gbG9nX3ZlcmJvc2UoLi4ubTogYW55W10pIHtcbiAgaWYgKCEhcHJvY2Vzcy5lbnZbJ1ZFUkJPU0VfTE9HUyddKSBjb25zb2xlLmVycm9yKCdbZ2VuZXJhdGVfYnVpbGRfZmlsZS5qc10nLCAuLi5tKTtcbn1cblxuY29uc3QgQlVJTERfRklMRV9IRUFERVIgPSBgIyBHZW5lcmF0ZWQgZmlsZSBmcm9tIHlhcm5faW5zdGFsbC9ucG1faW5zdGFsbCBydWxlLlxuIyBTZWUgJChiYXplbCBpbmZvIG91dHB1dF9iYXNlKS9leHRlcm5hbC9idWlsZF9iYXplbF9ydWxlc19ub2RlanMvaW50ZXJuYWwvbnBtX2luc3RhbGwvZ2VuZXJhdGVfYnVpbGRfZmlsZS5qc1xuXG4jIEFsbCBydWxlcyBpbiBvdGhlciByZXBvc2l0b3JpZXMgY2FuIHVzZSB0aGVzZSB0YXJnZXRzXG5wYWNrYWdlKGRlZmF1bHRfdmlzaWJpbGl0eSA9IFtcIi8vdmlzaWJpbGl0eTpwdWJsaWNcIl0pXG5cbmBcblxuY29uc3QgYXJncyA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbmNvbnN0IFdPUktTUEFDRSA9IGFyZ3NbMF07XG5jb25zdCBSVUxFX1RZUEUgPSBhcmdzWzFdO1xuY29uc3QgRVJST1JfT05fQkFaRUxfRklMRVMgPSBwYXJzZUludChhcmdzWzJdKTtcbmNvbnN0IExPQ0tfRklMRV9QQVRIID0gYXJnc1szXTtcbmNvbnN0IElOQ0xVREVEX0ZJTEVTID0gYXJnc1s0XSA/IGFyZ3NbNF0uc3BsaXQoJywnKSA6IFtdO1xuY29uc3QgRFlOQU1JQ19ERVBTID0gSlNPTi5wYXJzZShhcmdzWzVdIHx8ICd7fScpO1xuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgbWFpbigpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBkaXJlY3RvcnkgYW5kIGFueSBuZWNlc3Nhcnkgc3ViZGlyZWN0b3JpZXNcbiAqIGlmIHRoZXkgZG8gbm90IGV4aXN0LlxuICovXG5mdW5jdGlvbiBta2RpcnAocDogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhwKSkge1xuICAgIG1rZGlycChwYXRoLmRpcm5hbWUocCkpO1xuICAgIGZzLm1rZGlyU3luYyhwKTtcbiAgfVxufVxuXG4vKipcbiAqIFdyaXRlcyBhIGZpbGUsIGZpcnN0IGVuc3VyaW5nIHRoYXQgdGhlIGRpcmVjdG9yeSB0b1xuICogd3JpdGUgdG8gZXhpc3RzLlxuICovXG5mdW5jdGlvbiB3cml0ZUZpbGVTeW5jKHA6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gIG1rZGlycChwYXRoLmRpcm5hbWUocCkpO1xuICBmcy53cml0ZUZpbGVTeW5jKHAsIGNvbnRlbnQpO1xufVxuXG4vKipcbiAqIE1haW4gZW50cnlwb2ludC5cbiAqL1xuZnVuY3Rpb24gbWFpbigpIHtcbiAgLy8gZmluZCBhbGwgcGFja2FnZXMgKGluY2x1ZGluZyBwYWNrYWdlcyBpbiBuZXN0ZWQgbm9kZV9tb2R1bGVzKVxuICBjb25zdCBwa2dzID0gZmluZFBhY2thZ2VzKCk7XG5cbiAgLy8gZmxhdHRlbiBkZXBlbmRlbmNpZXNcbiAgZmxhdHRlbkRlcGVuZGVuY2llcyhwa2dzKTtcblxuICAvLyBnZW5lcmF0ZSBCYXplbCB3b3Jrc3BhY2VzXG4gIGdlbmVyYXRlQmF6ZWxXb3Jrc3BhY2VzKHBrZ3MpXG5cbiAgLy8gZ2VuZXJhdGUgYWxsIEJVSUxEIGZpbGVzXG4gIGdlbmVyYXRlQnVpbGRGaWxlcyhwa2dzKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbWFpbixcbiAgcHJpbnRQYWNrYWdlQmluLFxuICBhZGREeW5hbWljRGVwZW5kZW5jaWVzLFxuICBwcmludEluZGV4QnpsLFxufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYWxsIGJ1aWxkIGZpbGVzXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlQnVpbGRGaWxlcyhwa2dzOiBEZXBbXSkge1xuICBnZW5lcmF0ZVJvb3RCdWlsZEZpbGUocGtncy5maWx0ZXIocGtnID0+ICFwa2cuX2lzTmVzdGVkKSlcbiAgcGtncy5maWx0ZXIocGtnID0+ICFwa2cuX2lzTmVzdGVkKS5mb3JFYWNoKHBrZyA9PiBnZW5lcmF0ZVBhY2thZ2VCdWlsZEZpbGVzKHBrZykpO1xuICBmaW5kU2NvcGVzKCkuZm9yRWFjaChzY29wZSA9PiBnZW5lcmF0ZVNjb3BlQnVpbGRGaWxlcyhzY29wZSwgcGtncykpO1xufVxuXG4vKipcbiAqIEZsYXR0ZW5zIGRlcGVuZGVuY2llcyBvbiBhbGwgcGFja2FnZXNcbiAqL1xuZnVuY3Rpb24gZmxhdHRlbkRlcGVuZGVuY2llcyhwa2dzOiBEZXBbXSkge1xuICBjb25zdCBwa2dzTWFwID0gbmV3IE1hcCgpO1xuICBwa2dzLmZvckVhY2gocGtnID0+IHBrZ3NNYXAuc2V0KHBrZy5fZGlyLCBwa2cpKTtcbiAgcGtncy5mb3JFYWNoKHBrZyA9PiBmbGF0dGVuUGtnRGVwZW5kZW5jaWVzKHBrZywgcGtnLCBwa2dzTWFwKSk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBCYXplbCBmaWxlcyBpbiBucG0gZGlzdHJpYnV0aW9ucy5cbiAqL1xuZnVuY3Rpb24gaGlkZUJhemVsRmlsZXMocGtnOiBEZXApIHtcbiAgY29uc3QgaGFzSGlkZUJhemVsRmlsZXMgPSBpc0RpcmVjdG9yeSgnbm9kZV9tb2R1bGVzL0BiYXplbC9oaWRlLWJhemVsLWZpbGVzJyk7XG4gIHBrZy5fZmlsZXMgPSBwa2cuX2ZpbGVzLm1hcChmaWxlID0+IHtcbiAgICBjb25zdCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSk7XG4gICAgY29uc3QgYmFzZW5hbWVVYyA9IGJhc2VuYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKGJhc2VuYW1lVWMgPT09ICdCVUlMRCcgfHwgYmFzZW5hbWVVYyA9PT0gJ0JVSUxELkJBWkVMJykge1xuICAgICAgLy8gSWYgYmF6ZWwgZmlsZXMgYXJlIGRldGVjdGVkIGFuZCB0aGVyZSBpcyBubyBAYmF6ZWwvaGlkZS1iYXplbC1maWxlcyBucG1cbiAgICAgIC8vIHBhY2thZ2UgdGhlbiBlcnJvciBvdXQgYW5kIHN1Z2dlc3QgYWRkaW5nIHRoZSBwYWNrYWdlLiBJdCBpcyBwb3NzaWJsZSB0b1xuICAgICAgLy8gaGF2ZSBiYXplbCBCVUlMRCBmaWxlcyB3aXRoIHRoZSBwYWNrYWdlIGluc3RhbGxlZCBhcyBpdCdzIHBvc3RpbnN0YWxsXG4gICAgICAvLyBzdGVwLCB3aGljaCBoaWRlcyBiYXplbCBCVUlMRCBmaWxlcywgb25seSBydW5zIHdoZW4gdGhlIEBiYXplbC9oaWRlLWJhemVsLWZpbGVzXG4gICAgICAvLyBpcyBpbnN0YWxsZWQgYW5kIG5vdCB3aGVuIG5ldyBwYWNrYWdlcyBhcmUgYWRkZWQgKHZpYSBgeWFybiBhZGRgXG4gICAgICAvLyBmb3IgZXhhbXBsZSkgYWZ0ZXIgdGhlIGluaXRpYWwgaW5zdGFsbC4gSW4gdGhpcyBjYXNlLCBob3dldmVyLCB0aGUgcmVwbyBydWxlXG4gICAgICAvLyB3aWxsIHJlLXJ1biBhcyB0aGUgcGFja2FnZS5qc29uICYmIGxvY2sgZmlsZSBoYXMgY2hhbmdlZCBzbyB3ZSBqdXN0XG4gICAgICAvLyBoaWRlIHRoZSBhZGRlZCBCVUlMRCBmaWxlcyBkdXJpbmcgdGhlIHJlcG8gcnVsZSBydW4gaGVyZSBzaW5jZSBAYmF6ZWwvaGlkZS1iYXplbC1maWxlc1xuICAgICAgLy8gd2FzIG5vdCBydW4uXG4gICAgICBpZiAoIWhhc0hpZGVCYXplbEZpbGVzICYmIEVSUk9SX09OX0JBWkVMX0ZJTEVTKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYG5wbSBwYWNrYWdlICcke3BrZy5fZGlyfScgZnJvbSBAJHtXT1JLU1BBQ0V9ICR7UlVMRV9UWVBFfSBydWxlXG5oYXMgYSBCYXplbCBCVUlMRCBmaWxlICcke2ZpbGV9Jy4gVXNlIHRoZSBAYmF6ZWwvaGlkZS1iYXplbC1maWxlcyB1dGlsaXR5IHRvIGhpZGUgdGhlc2UgZmlsZXMuXG5TZWUgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2Jsb2IvbWFzdGVyL3BhY2thZ2VzL2hpZGUtYmF6ZWwtZmlsZXMvUkVBRE1FLm1kXG5mb3IgaW5zdGFsbGF0aW9uIGluc3RydWN0aW9ucy5gKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQWxsIEJhemVsIGZpbGVzIGluIHRoZSBucG0gZGlzdHJpYnV0aW9uIHNob3VsZCBiZSByZW5hbWVkIGJ5XG4gICAgICAgIC8vIGFkZGluZyBhIGBfYCBwcmVmaXggc28gdGhhdCBmaWxlIHRhcmdldHMgZG9uJ3QgY3Jvc3MgcGFja2FnZSBib3VuZGFyaWVzLlxuICAgICAgICBjb25zdCBuZXdGaWxlID0gcGF0aC5wb3NpeC5qb2luKHBhdGguZGlybmFtZShmaWxlKSwgYF8ke2Jhc2VuYW1lfWApO1xuICAgICAgICBjb25zdCBzcmNQYXRoID0gcGF0aC5wb3NpeC5qb2luKCdub2RlX21vZHVsZXMnLCBwa2cuX2RpciwgZmlsZSk7XG4gICAgICAgIGNvbnN0IGRzdFBhdGggPSBwYXRoLnBvc2l4LmpvaW4oJ25vZGVfbW9kdWxlcycsIHBrZy5fZGlyLCBuZXdGaWxlKTtcbiAgICAgICAgZnMucmVuYW1lU3luYyhzcmNQYXRoLCBkc3RQYXRoKTtcbiAgICAgICAgcmV0dXJuIG5ld0ZpbGU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaWxlO1xuICB9KTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgdGhlIHJvb3QgQlVJTEQgZmlsZS5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVSb290QnVpbGRGaWxlKHBrZ3M6IERlcFtdKSB7XG4gIGxldCBleHBvcnRzU3RhcmxhcmsgPSAnJztcbiAgcGtncy5mb3JFYWNoKHBrZyA9PiB7cGtnLl9maWxlcy5mb3JFYWNoKGYgPT4ge1xuICAgICAgICAgICAgICAgICBleHBvcnRzU3RhcmxhcmsgKz0gYCAgICBcIm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke2Z9XCIsXG5gO1xuICAgICAgICAgICAgICAgfSl9KTtcblxuICBsZXQgc3Jjc1N0YXJsYXJrID0gJyc7XG4gIGlmIChwa2dzLmxlbmd0aCkge1xuICAgIGNvbnN0IGxpc3QgPSBwa2dzLm1hcChwa2cgPT4gYFwiLy8ke3BrZy5fZGlyfToke3BrZy5fbmFtZX1fX2ZpbGVzXCIsYCkuam9pbignXFxuICAgICAgICAnKTtcbiAgICBzcmNzU3RhcmxhcmsgPSBgXG4gICAgIyBkaXJlY3Qgc291cmNlcyBsaXN0ZWQgZm9yIHN0cmljdCBkZXBzIHN1cHBvcnRcbiAgICBzcmNzID0gW1xuICAgICAgICAke2xpc3R9XG4gICAgXSxgO1xuICB9XG5cbiAgbGV0IGRlcHNTdGFybGFyayA9ICcnO1xuICBpZiAocGtncy5sZW5ndGgpIHtcbiAgICBjb25zdCBsaXN0ID0gcGtncy5tYXAocGtnID0+IGBcIi8vJHtwa2cuX2Rpcn06JHtwa2cuX25hbWV9X19jb250ZW50c1wiLGApLmpvaW4oJ1xcbiAgICAgICAgJyk7XG4gICAgZGVwc1N0YXJsYXJrID0gYFxuICAgICMgZmxhdHRlbmVkIGxpc3Qgb2YgZGlyZWN0IGFuZCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcyBob2lzdGVkIHRvIHJvb3QgYnkgdGhlIHBhY2thZ2UgbWFuYWdlclxuICAgIGRlcHMgPSBbXG4gICAgICAgICR7bGlzdH1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgYnVpbGRGaWxlID0gQlVJTERfRklMRV9IRUFERVIgK1xuICAgICAgYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy9pbnRlcm5hbC9ucG1faW5zdGFsbDpub2RlX21vZHVsZV9saWJyYXJ5LmJ6bFwiLCBcIm5vZGVfbW9kdWxlX2xpYnJhcnlcIilcblxuZXhwb3J0c19maWxlcyhbXG4ke2V4cG9ydHNTdGFybGFya31dKVxuXG4jIFRoZSBub2RlX21vZHVsZXMgZGlyZWN0b3J5IGluIG9uZSBjYXRjaC1hbGwgbm9kZV9tb2R1bGVfbGlicmFyeS5cbiMgTkI6IFVzaW5nIHRoaXMgdGFyZ2V0IG1heSBoYXZlIGJhZCBwZXJmb3JtYW5jZSBpbXBsaWNhdGlvbnMgaWZcbiMgdGhlcmUgYXJlIG1hbnkgZmlsZXMgaW4gdGFyZ2V0LlxuIyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzUxNTMuXG5ub2RlX21vZHVsZV9saWJyYXJ5KFxuICAgIG5hbWUgPSBcIm5vZGVfbW9kdWxlc1wiLCR7c3Jjc1N0YXJsYXJrfSR7ZGVwc1N0YXJsYXJrfVxuKVxuXG5gXG5cbiAgLy8gQWRkIHRoZSBtYW51YWwgYnVpbGQgZmlsZSBjb250ZW50cyBpZiB0aGV5IGV4aXN0c1xuICB0cnkge1xuICAgIGJ1aWxkRmlsZSArPSBmcy5yZWFkRmlsZVN5bmMoYG1hbnVhbF9idWlsZF9maWxlX2NvbnRlbnRzYCwge2VuY29kaW5nOiAndXRmOCd9KTtcbiAgfSBjYXRjaCAoZSkge1xuICB9XG5cbiAgd3JpdGVGaWxlU3luYygnQlVJTEQuYmF6ZWwnLCBidWlsZEZpbGUpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBhbGwgQlVJTEQgJiBiemwgZmlsZXMgZm9yIGEgcGFja2FnZS5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVQYWNrYWdlQnVpbGRGaWxlcyhwa2c6IERlcCkge1xuICBsZXQgYnVpbGRGaWxlID0gcHJpbnRQYWNrYWdlKHBrZyk7XG5cbiAgY29uc3QgYmluQnVpbGRGaWxlID0gcHJpbnRQYWNrYWdlQmluKHBrZyk7XG4gIGlmIChiaW5CdWlsZEZpbGUubGVuZ3RoKSB7XG4gICAgd3JpdGVGaWxlU3luYyhcbiAgICAgICAgcGF0aC5wb3NpeC5qb2luKHBrZy5fZGlyLCAnYmluJywgJ0JVSUxELmJhemVsJyksIEJVSUxEX0ZJTEVfSEVBREVSICsgYmluQnVpbGRGaWxlKTtcbiAgfVxuXG4gIGNvbnN0IGluZGV4RmlsZSA9IHByaW50SW5kZXhCemwocGtnKTtcbiAgaWYgKGluZGV4RmlsZS5sZW5ndGgpIHtcbiAgICB3cml0ZUZpbGVTeW5jKHBhdGgucG9zaXguam9pbihwa2cuX2RpciwgJ2luZGV4LmJ6bCcpLCBpbmRleEZpbGUpO1xuICAgIGJ1aWxkRmlsZSA9IGAke2J1aWxkRmlsZX1cbiMgRm9yIGludGVncmF0aW9uIHRlc3RpbmdcbmV4cG9ydHNfZmlsZXMoW1wiaW5kZXguYnpsXCJdKVxuYDtcbiAgfVxuXG4gIHdyaXRlRmlsZVN5bmMocGF0aC5wb3NpeC5qb2luKHBrZy5fZGlyLCAnQlVJTEQuYmF6ZWwnKSwgQlVJTERfRklMRV9IRUFERVIgKyBidWlsZEZpbGUpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGluc3RhbGxfPHdvcmtzcGFjZV9uYW1lPi5iemwgZmlsZXMgd2l0aCBmdW5jdGlvbiB0byBpbnN0YWxsIGVhY2ggd29ya3NwYWNlLlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZUJhemVsV29ya3NwYWNlcyhwa2dzOiBEZXBbXSkge1xuICBjb25zdCB3b3Jrc3BhY2VzOiBCYWc8c3RyaW5nPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgcGtnIG9mIHBrZ3MpIHtcbiAgICBpZiAoIXBrZy5iYXplbFdvcmtzcGFjZXMpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qgd29ya3NwYWNlIG9mIE9iamVjdC5rZXlzKHBrZy5iYXplbFdvcmtzcGFjZXMpKSB7XG4gICAgICAvLyBBIGJhemVsIHdvcmtzcGFjZSBjYW4gb25seSBiZSBzZXR1cCBieSBvbmUgbnBtIHBhY2thZ2VcbiAgICAgIGlmICh3b3Jrc3BhY2VzW3dvcmtzcGFjZV0pIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIGBDb3VsZCBub3Qgc2V0dXAgQmF6ZWwgd29ya3NwYWNlICR7d29ya3NwYWNlfSByZXF1ZXN0ZWQgYnkgbnBtIGAgK1xuICAgICAgICAgICAgYHBhY2thZ2UgJHtwa2cuX2Rpcn1AJHtwa2cudmVyc2lvbn0uIEFscmVhZHkgc2V0dXAgYnkgJHt3b3Jrc3BhY2VzW3dvcmtzcGFjZV19YCk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH1cblxuICAgICAgZ2VuZXJhdGVCYXplbFdvcmtzcGFjZShwa2csIHdvcmtzcGFjZSk7XG5cbiAgICAgIC8vIEtlZXAgdHJhY2sgb2Ygd2hpY2ggbnBtIHBhY2thZ2Ugc2V0dXAgdGhpcyBiYXplbCB3b3Jrc3BhY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgd29ya3NwYWNlc1t3b3Jrc3BhY2VdID0gYCR7cGtnLl9kaXJ9QCR7cGtnLnZlcnNpb259YDtcbiAgICB9XG4gIH1cblxuICAvLyBGaW5hbGx5IGdlbmVyYXRlIGluc3RhbGxfYmF6ZWxfZGVwZW5kZW5jaWVzLmJ6bFxuICBnZW5lcmF0ZUluc3RhbGxCYXplbERlcGVuZGVuY2llcyhPYmplY3Qua2V5cyh3b3Jrc3BhY2VzKSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgaW5zdGFsbF88d29ya3NwYWNlPi5iemwgZmlsZSB3aXRoIGZ1bmN0aW9uIHRvIGluc3RhbGwgdGhlIHdvcmtzcGFjZS5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVCYXplbFdvcmtzcGFjZShwa2c6IERlcCwgd29ya3NwYWNlOiBzdHJpbmcpIHtcbiAgbGV0IGJ6bEZpbGUgPSBgIyBHZW5lcmF0ZWQgYnkgdGhlIHlhcm5faW5zdGFsbC9ucG1faW5zdGFsbCBydWxlXG5sb2FkKFwiQGJ1aWxkX2JhemVsX3J1bGVzX25vZGVqcy8vaW50ZXJuYWwvY29weV9yZXBvc2l0b3J5OmNvcHlfcmVwb3NpdG9yeS5iemxcIiwgXCJjb3B5X3JlcG9zaXRvcnlcIilcblxuZGVmIF9tYXliZShyZXBvX3J1bGUsIG5hbWUsICoqa3dhcmdzKTpcbiAgICBpZiBuYW1lIG5vdCBpbiBuYXRpdmUuZXhpc3RpbmdfcnVsZXMoKTpcbiAgICAgICAgcmVwb19ydWxlKG5hbWUgPSBuYW1lLCAqKmt3YXJncylcbmA7XG5cbiAgY29uc3Qgcm9vdFBhdGggPSBwa2cuYmF6ZWxXb3Jrc3BhY2VzW3dvcmtzcGFjZV0ucm9vdFBhdGg7XG4gIGlmICghcm9vdFBhdGgpIHtcbiAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBgTWFsZm9ybWVkIGJhemVsV29ya3NwYWNlcyBhdHRyaWJ1dGUgaW4gJHtwa2cuX2Rpcn1AJHtwa2cudmVyc2lvbn0uIGAgK1xuICAgICAgICBgTWlzc2luZyByb290UGF0aCBmb3Igd29ya3NwYWNlICR7d29ya3NwYWNlfS5gKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cblxuICAvLyBDb3B5IGFsbCBmaWxlcyBmb3IgdGhpcyB3b3Jrc3BhY2UgdG8gYSBmb2xkZXIgdW5kZXIgX3dvcmtzcGFjZXNcbiAgLy8gdG8gcmVzdG9yZSB0aGUgQmF6ZWwgZmlsZXMgd2hpY2ggaGF2ZSBiZSByZW5hbWVkIGZyb20gdGhlIG5wbSBwYWNrYWdlXG4gIGNvbnN0IHdvcmtzcGFjZVNvdXJjZVBhdGggPSBwYXRoLnBvc2l4LmpvaW4oJ193b3Jrc3BhY2VzJywgd29ya3NwYWNlKTtcbiAgbWtkaXJwKHdvcmtzcGFjZVNvdXJjZVBhdGgpO1xuICBwa2cuX2ZpbGVzLmZvckVhY2goZmlsZSA9PiB7XG4gICAgaWYgKC9ebm9kZV9tb2R1bGVzWy9cXFxcXS8udGVzdChmaWxlKSkge1xuICAgICAgLy8gZG9uJ3QgY29weSBvdmVyIG5lc3RlZCBub2RlX21vZHVsZXNcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGRlc3RGaWxlID0gcGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSk7XG4gICAgaWYgKGRlc3RGaWxlLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICAgIC8vIHRoaXMgZmlsZSBpcyBub3QgdW5kZXIgdGhlIHJvb3RQYXRoXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKTtcbiAgICBjb25zdCBiYXNlbmFtZVVjID0gYmFzZW5hbWUudG9VcHBlckNhc2UoKTtcbiAgICAvLyBCYXplbCBCVUlMRCBmaWxlcyBmcm9tIG5wbSBkaXN0cmlidXRpb24gd291bGQgaGF2ZSBiZWVuIHJlbmFtZWQgZWFybGllciB3aXRoIGEgXyBwcmVmaXggc29cbiAgICAvLyB3ZSByZXN0b3JlIHRoZSBuYW1lIG9uIHRoZSBjb3B5XG4gICAgaWYgKGJhc2VuYW1lVWMgPT09ICdfQlVJTEQnIHx8IGJhc2VuYW1lVWMgPT09ICdfQlVJTEQuQkFaRUwnKSB7XG4gICAgICBkZXN0RmlsZSA9IHBhdGgucG9zaXguam9pbihwYXRoLmRpcm5hbWUoZGVzdEZpbGUpLCBiYXNlbmFtZS5zdWJzdHIoMSkpO1xuICAgIH1cbiAgICBjb25zdCBzcmMgPSBwYXRoLnBvc2l4LmpvaW4oJ25vZGVfbW9kdWxlcycsIHBrZy5fZGlyLCBmaWxlKTtcbiAgICBjb25zdCBkZXN0ID0gcGF0aC5wb3NpeC5qb2luKHdvcmtzcGFjZVNvdXJjZVBhdGgsIGRlc3RGaWxlKTtcbiAgICBta2RpcnAocGF0aC5kaXJuYW1lKGRlc3QpKTtcbiAgICBmcy5jb3B5RmlsZVN5bmMoc3JjLCBkZXN0KTtcbiAgfSk7XG5cbiAgLy8gV2UgY3JlYXRlIF9iYXplbF93b3Jrc3BhY2VfbWFya2VyIHRoYXQgaXMgdXNlZCBieSB0aGUgY3VzdG9tIGNvcHlfcmVwb3NpdG9yeVxuICAvLyBydWxlIHRvIHJlc29sdmUgdGhlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgc291cmNlIHJvb3QuIEEgcm9vdCBCVUlMRCBmaWxlXG4gIC8vIGlzIHJlcXVpcmVkIHRvIHJlZmVyZW5jZSBfYmF6ZWxfd29ya3NwYWNlX21hcmtlciBhcyBhIHRhcmdldCBzbyB3ZSBhbHNvIGNyZWF0ZVxuICAvLyBhbiBlbXB0eSBvbmUgaWYgb25lIGRvZXMgbm90IGV4aXN0LlxuICBpZiAoIWhhc1Jvb3RCdWlsZEZpbGUocGtnLCByb290UGF0aCkpIHtcbiAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgICBwYXRoLnBvc2l4LmpvaW4od29ya3NwYWNlU291cmNlUGF0aCwgJ0JVSUxELmJhemVsJyksXG4gICAgICAgICcjIE1hcmtlciBmaWxlIHRoYXQgdGhpcyBkaXJlY3RvcnkgaXMgYSBiYXplbCBwYWNrYWdlJyk7XG4gIH1cbiAgY29uc3Qgc2hhMjU2c3VtID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICBzaGEyNTZzdW0udXBkYXRlKGZzLnJlYWRGaWxlU3luYyhMT0NLX0ZJTEVfUEFUSCwge2VuY29kaW5nOiAndXRmOCd9KSk7XG4gIHdyaXRlRmlsZVN5bmMoXG4gICAgICBwYXRoLnBvc2l4LmpvaW4od29ya3NwYWNlU291cmNlUGF0aCwgJ19iYXplbF93b3Jrc3BhY2VfbWFya2VyJyksXG4gICAgICBgIyBNYXJrZXIgZmlsZSB0byB1c2VkIGJ5IGN1c3RvbSBjb3B5X3JlcG9zaXRvcnkgcnVsZVxcbiR7c2hhMjU2c3VtLmRpZ2VzdCgnaGV4Jyl9YCk7XG5cbiAgYnpsRmlsZSArPSBgZGVmIGluc3RhbGxfJHt3b3Jrc3BhY2V9KCk6XG4gICAgX21heWJlKFxuICAgICAgICBjb3B5X3JlcG9zaXRvcnksXG4gICAgICAgIG5hbWUgPSBcIiR7d29ya3NwYWNlfVwiLFxuICAgICAgICBtYXJrZXJfZmlsZSA9IFwiQCR7V09SS1NQQUNFfS8vX3dvcmtzcGFjZXMvJHt3b3Jrc3BhY2V9Ol9iYXplbF93b3Jrc3BhY2VfbWFya2VyXCIsXG4gICAgKVxuYDtcblxuICB3cml0ZUZpbGVTeW5jKGBpbnN0YWxsXyR7d29ya3NwYWNlfS5iemxgLCBiemxGaWxlKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBpbnN0YWxsX2JhemVsX2RlcGVuZGVuY2llcy5iemwgd2l0aCBmdW5jdGlvbiB0byBpbnN0YWxsIGFsbCB3b3Jrc3BhY2VzLlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZUluc3RhbGxCYXplbERlcGVuZGVuY2llcyh3b3Jrc3BhY2VzOiBzdHJpbmdbXSkge1xuICBsZXQgYnpsRmlsZSA9IGAjIEdlbmVyYXRlZCBieSB0aGUgeWFybl9pbnN0YWxsL25wbV9pbnN0YWxsIHJ1bGVcbmA7XG4gIHdvcmtzcGFjZXMuZm9yRWFjaCh3b3Jrc3BhY2UgPT4ge1xuICAgIGJ6bEZpbGUgKz0gYGxvYWQoXFxcIjppbnN0YWxsXyR7d29ya3NwYWNlfS5iemxcXFwiLCBcXFwiaW5zdGFsbF8ke3dvcmtzcGFjZX1cXFwiKVxuYDtcbiAgfSk7XG4gIGJ6bEZpbGUgKz0gYGRlZiBpbnN0YWxsX2JhemVsX2RlcGVuZGVuY2llcygpOlxuICAgIFwiXCJcIkluc3RhbGxzIGFsbCB3b3Jrc3BhY2VzIGxpc3RlZCBpbiBiYXplbFdvcmtzcGFjZXMgb2YgYWxsIG5wbSBwYWNrYWdlc1wiXCJcIlxuYDtcbiAgd29ya3NwYWNlcy5mb3JFYWNoKHdvcmtzcGFjZSA9PiB7XG4gICAgYnpsRmlsZSArPSBgICAgIGluc3RhbGxfJHt3b3Jrc3BhY2V9KClcbmA7XG4gIH0pO1xuXG4gIHdyaXRlRmlsZVN5bmMoJ2luc3RhbGxfYmF6ZWxfZGVwZW5kZW5jaWVzLmJ6bCcsIGJ6bEZpbGUpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGJ1aWxkIGZpbGVzIGZvciBhIHNjb3BlLlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVNjb3BlQnVpbGRGaWxlcyhzY29wZTogc3RyaW5nLCBwa2dzOiBEZXBbXSkge1xuICBjb25zdCBidWlsZEZpbGUgPSBCVUlMRF9GSUxFX0hFQURFUiArIHByaW50U2NvcGUoc2NvcGUsIHBrZ3MpO1xuICB3cml0ZUZpbGVTeW5jKHBhdGgucG9zaXguam9pbihzY29wZSwgJ0JVSUxELmJhemVsJyksIGJ1aWxkRmlsZSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgcGF0aCBpcyBhIGZpbGUuXG4gKi9cbmZ1bmN0aW9uIGlzRmlsZShwOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGZzLmV4aXN0c1N5bmMocCkgJiYgZnMuc3RhdFN5bmMocCkuaXNGaWxlKCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgcGF0aCBpcyBhbiBucG0gcGFja2FnZSB3aGljaCBpcyBpcyBhIGRpcmVjdG9yeSB3aXRoIGEgcGFja2FnZS5qc29uIGZpbGUuXG4gKi9cbmZ1bmN0aW9uIGlzRGlyZWN0b3J5KHA6IHN0cmluZykge1xuICByZXR1cm4gZnMuZXhpc3RzU3luYyhwKSAmJiBmcy5zdGF0U3luYyhwKS5pc0RpcmVjdG9yeSgpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHRoZSBmaWxlcyB1bmRlciBhIGRpcmVjdG9yeSBhcyByZWxhdGl2ZVxuICogcGF0aHMgdG8gdGhlIGRpcmVjdG9yeS5cbiAqL1xuZnVuY3Rpb24gbGlzdEZpbGVzKHJvb3REaXI6IHN0cmluZywgc3ViRGlyOiBzdHJpbmcgPSAnJyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgZGlyID0gcGF0aC5wb3NpeC5qb2luKHJvb3REaXIsIHN1YkRpcik7XG4gIGlmICghaXNEaXJlY3RvcnkoZGlyKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICByZXR1cm4gZnMucmVhZGRpclN5bmMoZGlyKVxuICAgICAgLnJlZHVjZShcbiAgICAgICAgICAoZmlsZXM6IHN0cmluZ1tdLCBmaWxlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGgucG9zaXguam9pbihkaXIsIGZpbGUpO1xuICAgICAgICAgICAgY29uc3QgcmVsUGF0aCA9IHBhdGgucG9zaXguam9pbihzdWJEaXIsIGZpbGUpO1xuICAgICAgICAgICAgY29uc3QgaXNTeW1ib2xpY0xpbmsgPSBmcy5sc3RhdFN5bmMoZnVsbFBhdGgpLmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICAgICAgICBsZXQgc3RhdDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHN0YXQgPSBmcy5zdGF0U3luYyhmdWxsUGF0aCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGlmIChpc1N5bWJvbGljTGluaykge1xuICAgICAgICAgICAgICAgIC8vIEZpbHRlciBvdXQgYnJva2VuIHN5bWJvbGljIGxpbmtzLiBUaGVzZSBjYXVzZSBmcy5zdGF0U3luYyhmdWxsUGF0aClcbiAgICAgICAgICAgICAgICAvLyB0byBmYWlsIHdpdGggYEVOT0VOVDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeSAuLi5gXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVzO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpc0RpcmVjdG9yeSA9IHN0YXQuaXNEaXJlY3RvcnkoKTtcbiAgICAgICAgICAgIGlmIChpc0RpcmVjdG9yeSAmJiBpc1N5bWJvbGljTGluaykge1xuICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IHN5bWJvbGljIGxpbmtzIHRvIGRpcmVjdG9yaWVzLiBBbiBpc3N1ZSBpbiB5YXJuIHZlcnNpb25zXG4gICAgICAgICAgICAgIC8vIG9sZGVyIHRoYW4gMS4xMi4xIGNyZWF0ZXMgc3ltYm9saWMgbGlua3MgdG8gZm9sZGVycyBpbiB0aGUgLmJpbiBmb2xkZXJcbiAgICAgICAgICAgICAgLy8gd2hpY2ggbGVhZHMgdG8gQmF6ZWwgdGFyZ2V0cyB0aGF0IGNyb3NzIHBhY2thZ2UgYm91bmRhcmllcy5cbiAgICAgICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvNDI4IGFuZFxuICAgICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzQzOC5cbiAgICAgICAgICAgICAgLy8gVGhpcyBpcyB0ZXN0ZWQgaW4gL2UyZS9maW5lX2dyYWluZWRfc3ltbGlua3MuXG4gICAgICAgICAgICAgIHJldHVybiBmaWxlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpc0RpcmVjdG9yeSA/IGZpbGVzLmNvbmNhdChsaXN0RmlsZXMocm9vdERpciwgcmVsUGF0aCkpIDogZmlsZXMuY29uY2F0KHJlbFBhdGgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10pXG4gICAgICAvLyBGaWxlcyB3aXRoIHNwYWNlcyAoXFx4MjApIG9yIHVuaWNvZGUgY2hhcmFjdGVycyAoPFxceDIwICYmID5cXHg3RSkgYXJlIG5vdCBhbGxvd2VkIGluXG4gICAgICAvLyBCYXplbCBydW5maWxlcy4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy80MzI3XG4gICAgICAuZmlsdGVyKGYgPT4gIS9bXlxceDIxLVxceDdFXS8udGVzdChmKSlcbiAgICAgIC8vIFdlIHJldHVybiBhIHNvcnRlZCBhcnJheSBzbyB0aGF0IHRoZSBvcmRlciBvZiBmaWxlc1xuICAgICAgLy8gaXMgdGhlIHNhbWUgcmVnYXJkbGVzcyBvZiBwbGF0Zm9ybVxuICAgICAgLnNvcnQoKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIG5wbSBwYWNrYWdlIGRpc3RyaWJ1dGlvbiBjb250YWluZWQgYVxuICogcm9vdCAvQlVJTEQgb3IgL0JVSUxELmJhemVsIGZpbGUuXG4gKi9cbmZ1bmN0aW9uIGhhc1Jvb3RCdWlsZEZpbGUocGtnOiBEZXAsIHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgZm9yIChjb25zdCBmaWxlIG9mIHBrZy5fZmlsZXMpIHtcbiAgICAvLyBCYXplbCBmaWxlcyB3b3VsZCBoYXZlIGJlZW4gcmVuYW1lZCBlYXJsaWVyIHdpdGggYSBgX2AgcHJlZml4XG4gICAgY29uc3QgZmlsZVVjID0gcGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkudG9VcHBlckNhc2UoKTtcbiAgICBpZiAoZmlsZVVjID09PSAnX0JVSUxEJyB8fCBmaWxlVWMgPT09ICdfQlVJTEQuQkFaRUwnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIGFkZER5bmFtaWNEZXBlbmRlbmNpZXMocGtnczogRGVwW10sIGR5bmFtaWNfZGVwcyA9IERZTkFNSUNfREVQUykge1xuICBmdW5jdGlvbiBtYXRjaChuYW1lOiBzdHJpbmcsIHA6IERlcCkge1xuICAgIC8vIEF1dG9tYXRpY2FsbHkgaW5jbHVkZSBkeW5hbWljIGRlcGVuZGVuY3kgb24gcGx1Z2lucyBvZiB0aGUgZm9ybSBwa2ctcGx1Z2luLWZvb1xuICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgoYCR7cC5fbW9kdWxlTmFtZX0tcGx1Z2luLWApKSByZXR1cm4gdHJ1ZTtcblxuICAgIGNvbnN0IHZhbHVlID0gZHluYW1pY19kZXBzW3AuX21vZHVsZU5hbWVdO1xuICAgIGlmIChuYW1lID09PSB2YWx1ZSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyBTdXBwb3J0IHdpbGRjYXJkIG1hdGNoXG4gICAgaWYgKHZhbHVlICYmIHZhbHVlLmluY2x1ZGVzKCcqJykgJiYgbmFtZS5zdGFydHNXaXRoKHZhbHVlLnN1YnN0cmluZygwLCB2YWx1ZS5pbmRleE9mKCcqJykpKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHBrZ3MuZm9yRWFjaChwID0+IHtcbiAgICBwLl9keW5hbWljRGVwZW5kZW5jaWVzID1cbiAgICAgICAgcGtncy5maWx0ZXIoXG4gICAgICAgICAgICAgICAgLy8gRmlsdGVyIGVudHJpZXMgbGlrZVxuICAgICAgICAgICAgICAgIC8vIFwiX2RpclwiOlwiY2hlY2stc2lkZS1lZmZlY3RzL25vZGVfbW9kdWxlcy9yb2xsdXAtcGx1Z2luLW5vZGUtcmVzb2x2ZVwiXG4gICAgICAgICAgICAgICAgeCA9PiAheC5fZGlyLmluY2x1ZGVzKCcvbm9kZV9tb2R1bGVzLycpICYmICEheC5fbW9kdWxlTmFtZSAmJlxuICAgICAgICAgICAgICAgICAgICBtYXRjaCh4Ll9tb2R1bGVOYW1lLCBwKSlcbiAgICAgICAgICAgIC5tYXAoZHluID0+IGAvLyR7ZHluLl9kaXJ9OiR7ZHluLl9uYW1lfWApO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaW5kcyBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBhbGwgcGFja2FnZXMgdW5kZXIgYSBnaXZlbiBwYXRoLlxuICovXG5mdW5jdGlvbiBmaW5kUGFja2FnZXMocCA9ICdub2RlX21vZHVsZXMnKSB7XG4gIGlmICghaXNEaXJlY3RvcnkocCkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBwa2dzOiBEZXBbXSA9IFtdO1xuXG4gIGNvbnN0IGxpc3RpbmcgPSBmcy5yZWFkZGlyU3luYyhwKTtcblxuICBjb25zdCBwYWNrYWdlcyA9IGxpc3RpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBzY29wZXNcbiAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmID0+ICFmLnN0YXJ0c1dpdGgoJ0AnKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBmb2xkZXJzIHN1Y2ggYXMgYC5iaW5gIHdoaWNoIGNhbiBjcmVhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gaXNzdWVzIG9uIFdpbmRvd3Mgc2luY2UgdGhlc2UgYXJlIFwiaGlkZGVuXCIgYnkgZGVmYXVsdFxuICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gIWYuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAgICAgICAgICAgICAgICAubWFwKGYgPT4gcGF0aC5wb3NpeC5qb2luKHAsIGYpKVxuICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gaXNEaXJlY3RvcnkoZikpO1xuXG4gIHBhY2thZ2VzLmZvckVhY2goXG4gICAgICBmID0+IHBrZ3MucHVzaChwYXJzZVBhY2thZ2UoZiksIC4uLmZpbmRQYWNrYWdlcyhwYXRoLnBvc2l4LmpvaW4oZiwgJ25vZGVfbW9kdWxlcycpKSkpO1xuXG4gIGNvbnN0IHNjb3BlcyA9IGxpc3RpbmcuZmlsdGVyKGYgPT4gZi5zdGFydHNXaXRoKCdAJykpXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGYgPT4gcGF0aC5wb3NpeC5qb2luKHAsIGYpKVxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmID0+IGlzRGlyZWN0b3J5KGYpKTtcbiAgc2NvcGVzLmZvckVhY2goZiA9PiBwa2dzLnB1c2goLi4uZmluZFBhY2thZ2VzKGYpKSk7XG5cbiAgYWRkRHluYW1pY0RlcGVuZGVuY2llcyhwa2dzKTtcblxuICByZXR1cm4gcGtncztcbn1cblxuLyoqXG4gKiBGaW5kcyBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBhbGwgcGFja2FnZSBzY29wZXMgaW4gbm9kZV9tb2R1bGVzLlxuICovXG5mdW5jdGlvbiBmaW5kU2NvcGVzKCkge1xuICBjb25zdCBwID0gJ25vZGVfbW9kdWxlcyc7XG4gIGlmICghaXNEaXJlY3RvcnkocCkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBsaXN0aW5nID0gZnMucmVhZGRpclN5bmMocCk7XG5cbiAgY29uc3Qgc2NvcGVzID0gbGlzdGluZy5maWx0ZXIoZiA9PiBmLnN0YXJ0c1dpdGgoJ0AnKSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBwYXRoLnBvc2l4LmpvaW4ocCwgZikpXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gaXNEaXJlY3RvcnkoZikpXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGYgPT4gZi5yZXBsYWNlKC9ebm9kZV9tb2R1bGVzXFwvLywgJycpKTtcblxuICByZXR1cm4gc2NvcGVzO1xufVxuXG4vKipcbiAqIEdpdmVuIHRoZSBuYW1lIG9mIGEgdG9wLWxldmVsIGZvbGRlciBpbiBub2RlX21vZHVsZXMsIHBhcnNlIHRoZVxuICogcGFja2FnZSBqc29uIGFuZCByZXR1cm4gaXQgYXMgYW4gb2JqZWN0IGFsb25nIHdpdGhcbiAqIHNvbWUgYWRkaXRpb25hbCBpbnRlcm5hbCBhdHRyaWJ1dGVzIHByZWZpeGVkIHdpdGggJ18nLlxuICovXG5mdW5jdGlvbiBwYXJzZVBhY2thZ2UocDogc3RyaW5nKTogRGVwIHtcbiAgLy8gUGFyc2UgdGhlIHBhY2thZ2UuanNvbiBmaWxlIG9mIHRoaXMgcGFja2FnZVxuICBjb25zdCBwYWNrYWdlSnNvbiA9IHBhdGgucG9zaXguam9pbihwLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBrZyA9IGlzRmlsZShwYWNrYWdlSnNvbikgPyBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwge2VuY29kaW5nOiAndXRmOCd9KSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3ZlcnNpb246ICcwLjAuMCd9O1xuXG4gIC8vIFRyaW0gdGhlIGxlYWRpbmcgbm9kZV9tb2R1bGVzIGZyb20gdGhlIHBhdGggYW5kXG4gIC8vIGFzc2lnbiB0byBfZGlyIGZvciBmdXR1cmUgdXNlXG4gIHBrZy5fZGlyID0gcC5yZXBsYWNlKC9ebm9kZV9tb2R1bGVzXFwvLywgJycpO1xuXG4gIC8vIFN0YXNoIHRoZSBwYWNrYWdlIGRpcmVjdG9yeSBuYW1lIGZvciBmdXR1cmUgdXNlXG4gIHBrZy5fbmFtZSA9IHBrZy5fZGlyLnNwbGl0KCcvJykucG9wKCk7XG5cbiAgLy8gTW9kdWxlIG5hbWUgb2YgdGhlIHBhY2thZ2UuIFVubGlrZSBcIl9uYW1lXCIgdGhpcyByZXByZXNlbnRzIHRoZVxuICAvLyBmdWxsIHBhY2thZ2UgbmFtZSAoaW5jbHVkaW5nIHNjb3BlIG5hbWUpLlxuICBwa2cuX21vZHVsZU5hbWUgPSBwa2cubmFtZSB8fCBgJHtwa2cuX2Rpcn0vJHtwa2cuX25hbWV9YDtcblxuICAvLyBLZWVwIHRyYWNrIG9mIHdoZXRoZXIgb3Igbm90IHRoaXMgaXMgYSBuZXN0ZWQgcGFja2FnZVxuICBwa2cuX2lzTmVzdGVkID0gL1xcL25vZGVfbW9kdWxlc1xcLy8udGVzdChwKTtcblxuICAvLyBMaXN0IGFsbCB0aGUgZmlsZXMgaW4gdGhlIG5wbSBwYWNrYWdlIGZvciBsYXRlciB1c2VcbiAgcGtnLl9maWxlcyA9IGxpc3RGaWxlcyhwKTtcblxuICAvLyBJbml0aWFsaXplIF9kZXBlbmRlbmNpZXMgdG8gYW4gZW1wdHkgYXJyYXlcbiAgLy8gd2hpY2ggaXMgbGF0ZXIgZmlsbGVkIHdpdGggdGhlIGZsYXR0ZW5lZCBkZXBlbmRlbmN5IGxpc3RcbiAgcGtnLl9kZXBlbmRlbmNpZXMgPSBbXTtcblxuICAvLyBIaWRlIGJhemVsIGZpbGVzIGluIHRoaXMgcGFja2FnZS4gV2UgZG8gdGhpcyBiZWZvcmUgcGFyc2luZ1xuICAvLyB0aGUgbmV4dCBwYWNrYWdlIHRvIHByZXZlbnQgaXNzdWVzIGNhdXNlZCBieSBzeW1saW5rcyBiZXR3ZWVuXG4gIC8vIHBhY2thZ2UgYW5kIG5lc3RlZCBwYWNrYWdlcyBzZXR1cCBieSB0aGUgcGFja2FnZSBtYW5hZ2VyLlxuICBoaWRlQmF6ZWxGaWxlcyhwa2cpO1xuXG4gIHJldHVybiBwa2c7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBiaW4gZW50cnkgaXMgYSBub24tZW1wdHkgcGF0aFxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQmluUGF0aChlbnRyeTogYW55KSB7XG4gIHJldHVybiBpc1ZhbGlkQmluUGF0aFN0cmluZ1ZhbHVlKGVudHJ5KSB8fCBpc1ZhbGlkQmluUGF0aE9iamVjdFZhbHVlcyhlbnRyeSk7XG59XG5cbi8qKlxuICogSWYgZ2l2ZW4gYSBzdHJpbmcsIGNoZWNrIGlmIGEgYmluIGVudHJ5IGlzIGEgbm9uLWVtcHR5IHBhdGhcbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEJpblBhdGhTdHJpbmdWYWx1ZShlbnRyeTogYW55KSB7XG4gIHJldHVybiB0eXBlb2YgZW50cnkgPT09ICdzdHJpbmcnICYmIGVudHJ5ICE9PSAnJztcbn1cblxuLyoqXG4gKiBJZiBnaXZlbiBhbiBvYmplY3QgbGl0ZXJhbCwgY2hlY2sgaWYgYSBiaW4gZW50cnkgb2JqZWN0cyBoYXMgYXQgbGVhc3Qgb25lIGEgbm9uLWVtcHR5IHBhdGhcbiAqIEV4YW1wbGUgMTogeyBlbnRyeTogJy4vcGF0aC90by9zY3JpcHQuanMnIH0gPT0+IFZBTElEXG4gKiBFeGFtcGxlIDI6IHsgZW50cnk6ICcnIH0gPT0+IElOVkFMSURcbiAqIEV4YW1wbGUgMzogeyBlbnRyeTogJy4vcGF0aC90by9zY3JpcHQuanMnLCBlbXB0eTogJycgfSA9PT4gVkFMSURcbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEJpblBhdGhPYmplY3RWYWx1ZXMoZW50cnk6IEJhZzxzdHJpbmc+KTogYm9vbGVhbiB7XG4gIC8vIFdlIGFsbG93IGF0IGxlYXN0IG9uZSB2YWxpZCBlbnRyeSBwYXRoIChpZiBhbnkpLlxuICByZXR1cm4gZW50cnkgJiYgdHlwZW9mIGVudHJ5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgT2JqZWN0Wyd2YWx1ZXMnXShlbnRyeSkuZmlsdGVyKF9lbnRyeSA9PiBpc1ZhbGlkQmluUGF0aChfZW50cnkpKS5sZW5ndGggPiAwO1xufVxuXG4vKipcbiAqIENsZWFudXAgYSBwYWNrYWdlLmpzb24gXCJiaW5cIiBwYXRoLlxuICpcbiAqIEJpbiBwYXRocyB1c3VhbGx5IGNvbWUgaW4gMiBmbGF2b3JzOiAnLi9iaW4vZm9vJyBvciAnYmluL2ZvbycsXG4gKiBzb21ldGltZXMgb3RoZXIgc3R1ZmYgbGlrZSAnbGliL2ZvbycuICBSZW1vdmUgcHJlZml4ICcuLycgaWYgaXRcbiAqIGV4aXN0cy5cbiAqL1xuZnVuY3Rpb24gY2xlYW51cEJpblBhdGgocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuaW5kZXhPZignLi8nKSA9PT0gMCkge1xuICAgIHAgPSBwLnNsaWNlKDIpO1xuICB9XG4gIHJldHVybiBwO1xufVxuXG4vKipcbiAqIENsZWFudXAgYSBwYWNrYWdlLmpzb24gZW50cnkgcG9pbnQgc3VjaCBhcyBcIm1haW5cIlxuICpcbiAqIFJlbW92ZXMgJy4vJyBpZiBpdCBleGlzdHMuXG4gKiBBcHBlbmRzIGBpbmRleC5qc2AgaWYgcCBlbmRzIHdpdGggYC9gLlxuICovXG5mdW5jdGlvbiBjbGVhbnVwRW50cnlQb2ludFBhdGgocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuaW5kZXhPZignLi8nKSA9PT0gMCkge1xuICAgIHAgPSBwLnNsaWNlKDIpO1xuICB9XG4gIGlmIChwLmVuZHNXaXRoKCcvJykpIHtcbiAgICBwICs9ICdpbmRleC5qcyc7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG5cbi8qKlxuICogQ2xlYW5zIHVwIHRoZSBnaXZlbiBwYXRoXG4gKiBUaGVuIHRyaWVzIHRvIHJlc29sdmUgdGhlIHBhdGggaW50byBhIGZpbGUgYW5kIHdhcm5zIGlmIFZFUkJPU0VfTE9HUyBzZXQgYW5kIHRoZSBmaWxlIGRvc2VuJ3RcbiAqIGV4aXN0XG4gKiBAcGFyYW0ge2FueX0gcGtnXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHJldHVybnMge3N0cmluZyB8IHVuZGVmaW5lZH1cbiAqL1xuZnVuY3Rpb24gZmluZEVudHJ5RmlsZShwa2c6IERlcCwgcGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IGNsZWFuUGF0aCA9IGNsZWFudXBFbnRyeVBvaW50UGF0aChwYXRoKTtcbiAgLy8gY2hlY2sgaWYgbWFpbiBlbnRyeSBwb2ludCBleGlzdHNcbiAgY29uc3QgZW50cnlGaWxlID0gZmluZEZpbGUocGtnLCBjbGVhblBhdGgpIHx8IGZpbmRGaWxlKHBrZywgYCR7Y2xlYW5QYXRofS5qc2ApO1xuICBpZiAoIWVudHJ5RmlsZSkge1xuICAgIC8vIElmIGVudHJ5UG9pbnQgZW50cnkgcG9pbnQgbGlzdGVkIGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhIGZpbGVcbiAgICAvLyBUaGlzIGNhbiBoYXBwZW5cbiAgICAvLyBpbiBzb21lIG5wbSBwYWNrYWdlcyB0aGF0IGxpc3QgYW4gaW5jb3JyZWN0IG1haW4gc3VjaCBhcyB2OC1jb3ZlcmFnZUAxLjAuOFxuICAgIC8vIHdoaWNoIGxpc3RzIGBcIm1haW5cIjogXCJpbmRleC5qc1wiYCBidXQgdGhhdCBmaWxlIGRvZXMgbm90IGV4aXN0LlxuICAgIGxvZ192ZXJib3NlKFxuICAgICAgICBgY291bGQgbm90IGZpbmQgZW50cnkgcG9pbnQgZm9yIHRoZSBwYXRoICR7Y2xlYW5QYXRofSBnaXZlbiBieSBucG0gcGFja2FnZSAke3BrZy5fbmFtZX1gKTtcbiAgfVxuICByZXR1cm4gZW50cnlGaWxlO1xufVxuXG4vKipcbiAqIFRyaWVzIHRvIHJlc29sdmUgdGhlIGVudHJ5UG9pbnQgZmlsZSBmcm9tIHRoZSBwa2cgZm9yIGEgZ2l2ZW4gbWFpbkZpbGVOYW1lXG4gKlxuICogQHBhcmFtIHthbnl9IHBrZ1xuICogQHBhcmFtIHsnYnJvd3NlcicgfCAnbW9kdWxlJyB8ICdtYWluJ30gbWFpbkZpbGVOYW1lXG4gKiBAcmV0dXJucyB7c3RyaW5nIHwgdW5kZWZpbmVkfSB0aGUgcGF0aCBvciB1bmRlZmluZWQgaWYgd2UgY2FudCByZXNvbHZlIHRoZSBmaWxlXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVNYWluRmlsZShwa2c6IERlcCwgbWFpbkZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgbWFpbkVudHJ5RmllbGQgPSBwa2dbbWFpbkZpbGVOYW1lXTtcblxuICBpZiAobWFpbkVudHJ5RmllbGQpIHtcbiAgICBpZiAodHlwZW9mIG1haW5FbnRyeUZpZWxkID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGZpbmRFbnRyeUZpbGUocGtnLCBtYWluRW50cnlGaWVsZClcblxuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1haW5FbnRyeUZpZWxkID09PSAnb2JqZWN0JyAmJiBtYWluRmlsZU5hbWUgPT09ICdicm93c2VyJykge1xuICAgICAgLy8gYnJvd3NlciBoYXMgYSB3ZWlyZCB3YXkgb2YgZGVmaW5pbmcgdGhpc1xuICAgICAgLy8gdGhlIGJyb3dzZXIgdmFsdWUgaXMgYW4gb2JqZWN0IGxpc3RpbmcgZmlsZXMgdG8gYWxpYXMsIHVzdWFsbHkgcG9pbnRpbmcgdG8gYSBicm93c2VyIGRpclxuICAgICAgY29uc3QgaW5kZXhFbnRyeVBvaW50ID0gbWFpbkVudHJ5RmllbGRbJ2luZGV4LmpzJ10gfHwgbWFpbkVudHJ5RmllbGRbJy4vaW5kZXguanMnXTtcbiAgICAgIGlmIChpbmRleEVudHJ5UG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRFbnRyeUZpbGUocGtnLCBpbmRleEVudHJ5UG9pbnQpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVHJpZXMgdG8gcmVzb2x2ZSB0aGUgbWFpbkZpbGUgZnJvbSBhIGdpdmVuIHBrZ1xuICogVGhpcyB1c2VzIHNldmVhbCBtYWluRmlsZU5hbWVzIGluIHByaW9yaXR5IHRvIGZpbmQgYSBjb3JyZWN0IHVzYWJsZSBmaWxlXG4gKiBAcGFyYW0ge2FueX0gcGtnXG4gKiBAcmV0dXJucyB7c3RyaW5nIHwgdW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiByZXNvbHZlUGtnTWFpbkZpbGUocGtnOiBEZXApIHtcbiAgLy8gZXMyMDE1IGlzIGFub3RoZXIgb3B0aW9uIGZvciBtYWluRmlsZSBoZXJlXG4gIC8vIGJ1dCBpdHMgdmVyeSB1bmNvbW1vbiBhbmQgaW0gbm90IHN1cmUgd2hhdCBwcmlvcml0eSBpdCB0YWtlc1xuICAvL1xuICAvLyB0aGlzIGxpc3QgaXMgb3JkZXJlZCwgd2UgdHJ5IHJlc29sdmUgYGJyb3dzZXJgIGZpcnN0LCB0aGVuIGBtb2R1bGVgIGFuZCBmaW5hbGx5IGZhbGwgYmFjayB0b1xuICAvLyBgbWFpbmBcbiAgY29uc3QgbWFpbkZpbGVOYW1lcyA9IFsnYnJvd3NlcicsICdtb2R1bGUnLCAnbWFpbiddXG5cbiAgICAgIGZvciAoY29uc3QgbWFpbkZpbGUgb2YgbWFpbkZpbGVOYW1lcykge1xuICAgIGNvbnN0IHJlc29sdmVkTWFpbkZpbGUgPSByZXNvbHZlTWFpbkZpbGUocGtnLCBtYWluRmlsZSk7XG4gICAgaWYgKHJlc29sdmVkTWFpbkZpbGUpIHtcbiAgICAgIHJldHVybiByZXNvbHZlZE1haW5GaWxlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHdlIGNhbnQgZmluZCBhbnkgY29ycmVjdCBmaWxlIHJlZmVyZW5jZXMgZnJvbSB0aGUgcGtnXG4gIC8vIHRoZW4gd2UganVzdCB0cnkgbG9va2luZyBhcm91bmQgZm9yIGNvbW1vbiBwYXR0ZXJuc1xuICBjb25zdCBtYXliZVJvb3RJbmRleCA9IGZpbmRFbnRyeUZpbGUocGtnLCAnaW5kZXguanMnKTtcbiAgaWYgKG1heWJlUm9vdEluZGV4KSB7XG4gICAgcmV0dXJuIG1heWJlUm9vdEluZGV4XG4gIH1cblxuICBjb25zdCBtYXliZVNlbGZOYW1lZEluZGV4ID0gZmluZEVudHJ5RmlsZShwa2csIGAke3BrZy5fbmFtZX0uanNgKTtcbiAgaWYgKG1heWJlU2VsZk5hbWVkSW5kZXgpIHtcbiAgICByZXR1cm4gbWF5YmVTZWxmTmFtZWRJbmRleDtcbiAgfVxuXG4gIC8vIG5vbmUgb2YgdGhlIG1ldGhvZHMgd2UgdHJpZWQgcmVzdWx0ZWQgaW4gYSBmaWxlXG4gIGxvZ192ZXJib3NlKGBjb3VsZCBub3QgZmluZCBlbnRyeSBwb2ludCBmb3IgbnBtIHBhY2thZ2UgJHtwa2cuX25hbWV9YCk7XG5cbiAgLy8gYXQgdGhpcyBwb2ludCB0aGVyZSdzIG5vdGhpbmcgbGVmdCBmb3IgdXMgdG8gdHJ5LCBzbyByZXR1cm4gbm90aGluZ1xuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG50eXBlIEJhZzxUPiA9XG4gICAge1xuICAgICAgW2s6IHN0cmluZ106IFRcbiAgICB9XG5cbi8qKlxuICogRmxhdHRlbnMgYWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIG9mIGEgcGFja2FnZVxuICogaW50byBhIF9kZXBlbmRlbmNpZXMgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5Qa2dEZXBlbmRlbmNpZXMocGtnOiBEZXAsIGRlcDogRGVwLCBwa2dzTWFwOiBNYXA8c3RyaW5nLCBEZXA+KSB7XG4gIGlmIChwa2cuX2RlcGVuZGVuY2llcy5pbmRleE9mKGRlcCkgIT09IC0xKSB7XG4gICAgLy8gY2lyY3VsYXIgZGVwZW5kZW5jeVxuICAgIHJldHVybjtcbiAgfVxuICBwa2cuX2RlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gIGNvbnN0IGZpbmREZXBzID0gZnVuY3Rpb24odGFyZ2V0RGVwczogQmFnPHN0cmluZz4sIHJlcXVpcmVkOiBib29sZWFuLCBkZXBUeXBlOiBzdHJpbmcpIHtcbiAgICBPYmplY3Qua2V5cyh0YXJnZXREZXBzIHx8IHt9KVxuICAgICAgICAubWFwKHRhcmdldERlcCA9PiB7XG4gICAgICAgICAgLy8gbG9vayBmb3IgbWF0Y2hpbmcgbmVzdGVkIHBhY2thZ2VcbiAgICAgICAgICBjb25zdCBkaXJTZWdtZW50cyA9IGRlcC5fZGlyLnNwbGl0KCcvJyk7XG4gICAgICAgICAgd2hpbGUgKGRpclNlZ21lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgbWF5YmUgPSBwYXRoLnBvc2l4LmpvaW4oLi4uZGlyU2VnbWVudHMsICdub2RlX21vZHVsZXMnLCB0YXJnZXREZXApO1xuICAgICAgICAgICAgaWYgKHBrZ3NNYXAuaGFzKG1heWJlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gcGtnc01hcC5nZXQobWF5YmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlyU2VnbWVudHMucG9wKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGxvb2sgZm9yIG1hdGNoaW5nIHJvb3QgcGFja2FnZVxuICAgICAgICAgIGlmIChwa2dzTWFwLmhhcyh0YXJnZXREZXApKSB7XG4gICAgICAgICAgICByZXR1cm4gcGtnc01hcC5nZXQodGFyZ2V0RGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZGVwZW5kZW5jeSBub3QgZm91bmRcbiAgICAgICAgICBpZiAocmVxdWlyZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYGNvdWxkIG5vdCBmaW5kICR7ZGVwVHlwZX0gJyR7dGFyZ2V0RGVwfScgb2YgJyR7ZGVwLl9kaXJ9J2ApO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSlcbiAgICAgICAgLmZpbHRlcihkZXAgPT4gISFkZXApXG4gICAgICAgIC5mb3JFYWNoKGRlcCA9PiBmbGF0dGVuUGtnRGVwZW5kZW5jaWVzKHBrZywgZGVwISwgcGtnc01hcCkpO1xuICB9O1xuICAvLyBucG0gd2lsbCBpbiBzb21lIGNhc2VzIGFkZCBvcHRpb25hbERlcGVuZGVuY2llcyB0byB0aGUgbGlzdFxuICAvLyBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIHBhY2thZ2UuanNvbiBpdCB3cml0ZXMgdG8gbm9kZV9tb2R1bGVzLlxuICAvLyBXZSBkZWxldGUgdGhlc2UgaGVyZSBpZiB0aGV5IGV4aXN0IGFzIHRoZXkgbWF5IHJlc3VsdFxuICAvLyBpbiBleHBlY3RlZCBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbm90IGZvdW5kLlxuICBpZiAoZGVwLmRlcGVuZGVuY2llcyAmJiBkZXAub3B0aW9uYWxEZXBlbmRlbmNpZXMpIHtcbiAgICBPYmplY3Qua2V5cyhkZXAub3B0aW9uYWxEZXBlbmRlbmNpZXMpLmZvckVhY2gob3B0aW9uYWxEZXAgPT4ge1xuICAgICAgZGVsZXRlIGRlcC5kZXBlbmRlbmNpZXNbb3B0aW9uYWxEZXBdO1xuICAgIH0pO1xuICB9XG5cbiAgZmluZERlcHMoZGVwLmRlcGVuZGVuY2llcywgdHJ1ZSwgJ2RlcGVuZGVuY3knKTtcbiAgZmluZERlcHMoZGVwLnBlZXJEZXBlbmRlbmNpZXMsIHRydWUsICdwZWVyIGRlcGVuZGVuY3knKTtcbiAgLy8gYG9wdGlvbmFsRGVwZW5kZW5jaWVzYCB0aGF0IGFyZSBtaXNzaW5nIHNob3VsZCBiZSBzaWxlbnRseVxuICAvLyBpZ25vcmVkIHNpbmNlIHRoZSBucG0veWFybiB3aWxsIG5vdCBmYWlsIGlmIHRoZXNlIGRlcGVuZGVuY2llc1xuICAvLyBmYWlsIHRvIGluc3RhbGwuIFBhY2thZ2VzIHNob3VsZCBoYW5kbGUgdGhlIGNhc2VzIHdoZXJlIHRoZXNlXG4gIC8vIGRlcGVuZGVuY2llcyBhcmUgbWlzc2luZyBncmFjZWZ1bGx5IGF0IHJ1bnRpbWUuXG4gIC8vIEFuIGV4YW1wbGUgb2YgdGhpcyBpcyB0aGUgYGNob2tpZGFyYCBwYWNrYWdlIHdoaWNoIHNwZWNpZmllc1xuICAvLyBgZnNldmVudHNgIGFzIGFuIG9wdGlvbmFsRGVwZW5kZW5jeS4gT24gT1NYLCBgZnNldmVudHNgXG4gIC8vIGlzIGluc3RhbGxlZCBzdWNjZXNzZnVsbHksIGJ1dCBvbiBXaW5kb3dzICYgTGludXgsIGBmc2V2ZW50c2BcbiAgLy8gZmFpbHMgdG8gaW5zdGFsbCBhbmQgdGhlIHBhY2thZ2Ugd2lsbCBub3QgYmUgcHJlc2VudCB3aGVuXG4gIC8vIGNoZWNraW5nIHRoZSBkZXBlbmRlbmNpZXMgb2YgYGNob2tpZGFyYC5cbiAgZmluZERlcHMoZGVwLm9wdGlvbmFsRGVwZW5kZW5jaWVzLCBmYWxzZSwgJ29wdGlvbmFsIGRlcGVuZGVuY3knKTtcbn1cblxuLyoqXG4gKiBSZWZvcm1hdC9wcmV0dHktcHJpbnQgYSBqc29uIG9iamVjdCBhcyBhIHNreWxhcmsgY29tbWVudCAoZWFjaCBsaW5lXG4gKiBzdGFydHMgd2l0aCAnIyAnKS5cbiAqL1xuZnVuY3Rpb24gcHJpbnRKc29uKHBrZzogRGVwKSB7XG4gIC8vIENsb25lIGFuZCBtb2RpZnkgX2RlcGVuZGVuY2llcyB0byBhdm9pZCBjaXJjdWxhciBpc3N1ZXMgd2hlbiBKU09OaWZ5aW5nXG4gIC8vICYgZGVsZXRlIF9maWxlcyBhcnJheVxuICBjb25zdCBjbG9uZWQ6IGFueSA9IHsuLi5wa2d9O1xuICBjbG9uZWQuX2RlcGVuZGVuY2llcyA9IHBrZy5fZGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gZGVwLl9kaXIpO1xuICBkZWxldGUgY2xvbmVkLl9maWxlcztcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGNsb25lZCwgbnVsbCwgMikuc3BsaXQoJ1xcbicpLm1hcChsaW5lID0+IGAjICR7bGluZX1gKS5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBBIGZpbHRlciBmdW5jdGlvbiBmb3IgZmlsZXMgaW4gYW4gbnBtIHBhY2thZ2UuIENvbXBhcmlzb24gaXMgY2FzZS1pbnNlbnNpdGl2ZS5cbiAqIEBwYXJhbSBmaWxlcyBhcnJheSBvZiBmaWxlcyB0byBmaWx0ZXJcbiAqIEBwYXJhbSBleHRzIGxpc3Qgb2Ygd2hpdGUgbGlzdGVkIGNhc2UtaW5zZW5zaXRpdmUgZXh0ZW5zaW9uczsgaWYgZW1wdHksIG5vIGZpbHRlciBpc1xuICogICAgICAgICAgICAgZG9uZSBvbiBleHRlbnNpb25zOyAnJyBlbXB0eSBzdHJpbmcgZGVub3RlcyB0byBhbGxvdyBmaWxlcyB3aXRoIG5vIGV4dGVuc2lvbnMsXG4gKiAgICAgICAgICAgICBvdGhlciBleHRlbnNpb25zIGFyZSBsaXN0ZWQgd2l0aCAnLmV4dCcgbm90YXRpb24gc3VjaCBhcyAnLmQudHMnLlxuICovXG5mdW5jdGlvbiBmaWx0ZXJGaWxlcyhmaWxlczogc3RyaW5nW10sIGV4dHM6IHN0cmluZ1tdID0gW10pIHtcbiAgaWYgKGV4dHMubGVuZ3RoKSB7XG4gICAgY29uc3QgYWxsb3dOb0V4dHMgPSBleHRzLmluY2x1ZGVzKCcnKTtcbiAgICBmaWxlcyA9IGZpbGVzLmZpbHRlcihmID0+IHtcbiAgICAgIC8vIGluY2x1ZGUgZmlsZXMgd2l0aCBubyBleHRlbnNpb25zIGlmIG5vRXh0IGlzIHRydWVcbiAgICAgIGlmIChhbGxvd05vRXh0cyAmJiAhcGF0aC5leHRuYW1lKGYpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIC8vIGZpbHRlciBmaWxlcyBpbiBleHRzXG4gICAgICBjb25zdCBsYyA9IGYudG9Mb3dlckNhc2UoKTtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBleHRzKSB7XG4gICAgICAgIGlmIChlICYmIGxjLmVuZHNXaXRoKGUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pXG4gIH1cbiAgLy8gRmlsdGVyIG91dCBCVUlMRCBmaWxlcyB0aGF0IGNhbWUgd2l0aCB0aGUgbnBtIHBhY2thZ2VcbiAgcmV0dXJuIGZpbGVzLmZpbHRlcihmaWxlID0+IHtcbiAgICBjb25zdCBiYXNlbmFtZVVjID0gcGF0aC5iYXNlbmFtZShmaWxlKS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChiYXNlbmFtZVVjID09PSAnX0JVSUxEJyB8fCBiYXNlbmFtZVVjID09PSAnX0JVSUxELkJBWkVMJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBzcGVjaWZpZWQgYHBrZ2AgY29uZm9ybXMgdG8gQW5ndWxhciBQYWNrYWdlIEZvcm1hdCAoQVBGKSxcbiAqIGZhbHNlIG90aGVyd2lzZS4gSWYgdGhlIHBhY2thZ2UgY29udGFpbnMgYCoubWV0YWRhdGEuanNvbmAgYW5kIGFcbiAqIGNvcnJlc3BvbmRpbmcgc2libGluZyBgLmQudHNgIGZpbGUsIHRoZW4gdGhlIHBhY2thZ2UgaXMgY29uc2lkZXJlZCB0byBiZSBBUEYuXG4gKi9cbmZ1bmN0aW9uIGlzTmdBcGZQYWNrYWdlKHBrZzogRGVwKSB7XG4gIGNvbnN0IHNldCA9IG5ldyBTZXQocGtnLl9maWxlcyk7XG4gIGlmIChzZXQuaGFzKCdBTkdVTEFSX1BBQ0tBR0UnKSkge1xuICAgIC8vIFRoaXMgZmlsZSBpcyB1c2VkIGJ5IHRoZSBucG0veWFybl9pbnN0YWxsIHJ1bGUgdG8gZGV0ZWN0IEFQRi4gU2VlXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy85MjdcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBjb25zdCBtZXRhZGF0YUV4dCA9IC9cXC5tZXRhZGF0YVxcLmpzb24kLztcbiAgcmV0dXJuIHBrZy5fZmlsZXMuc29tZSgoZmlsZSkgPT4ge1xuICAgIGlmIChtZXRhZGF0YUV4dC50ZXN0KGZpbGUpKSB7XG4gICAgICBjb25zdCBzaWJsaW5nID0gZmlsZS5yZXBsYWNlKG1ldGFkYXRhRXh0LCAnLmQudHMnKTtcbiAgICAgIGlmIChzZXQuaGFzKHNpYmxpbmcpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufVxuXG4vKipcbiAqIElmIHRoZSBwYWNrYWdlIGlzIGluIHRoZSBBbmd1bGFyIHBhY2thZ2UgZm9ybWF0IHJldHVybnMgbGlzdFxuICogb2YgcGFja2FnZSBmaWxlcyB0aGF0IGVuZCB3aXRoIGAudW1kLmpzYCwgYC5uZ2ZhY3RvcnkuanNgIGFuZCBgLm5nc3VtbWFyeS5qc2AuXG4gKi9cbmZ1bmN0aW9uIGdldE5nQXBmU2NyaXB0cyhwa2c6IERlcCkge1xuICByZXR1cm4gaXNOZ0FwZlBhY2thZ2UocGtnKSA/XG4gICAgICBmaWx0ZXJGaWxlcyhwa2cuX2ZpbGVzLCBbJy51bWQuanMnLCAnLm5nZmFjdG9yeS5qcycsICcubmdzdW1tYXJ5LmpzJ10pIDpcbiAgICAgIFtdO1xufVxuXG4vKipcbiAqIExvb2tzIGZvciBhIGZpbGUgd2l0aGluIGEgcGFja2FnZSBhbmQgcmV0dXJucyBpdCBpZiBmb3VuZC5cbiAqL1xuZnVuY3Rpb24gZmluZEZpbGUocGtnOiBEZXAsIG06IHN0cmluZykge1xuICBjb25zdCBtbCA9IG0udG9Mb3dlckNhc2UoKTtcbiAgZm9yIChjb25zdCBmIG9mIHBrZy5fZmlsZXMpIHtcbiAgICBpZiAoZi50b0xvd2VyQ2FzZSgpID09PSBtbCkge1xuICAgICAgcmV0dXJuIGY7XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBwa2csIHJldHVybiB0aGUgc2t5bGFyayBgbm9kZV9tb2R1bGVfbGlicmFyeWAgdGFyZ2V0cyBmb3IgdGhlIHBhY2thZ2UuXG4gKi9cbmZ1bmN0aW9uIHByaW50UGFja2FnZShwa2c6IERlcCkge1xuICBjb25zdCBzb3VyY2VzID0gZmlsdGVyRmlsZXMocGtnLl9maWxlcywgSU5DTFVERURfRklMRVMpO1xuICBjb25zdCBkdHNTb3VyY2VzID0gZmlsdGVyRmlsZXMocGtnLl9maWxlcywgWycuZC50cyddKTtcbiAgLy8gVE9ETyhnbWFnb2xhbik6IGFkZCBVTUQgJiBBTUQgc2NyaXB0cyB0byBzY3JpcHRzIGV2ZW4gaWYgbm90IGFuIEFQRiBwYWNrYWdlIF9idXRfIG9ubHkgaWYgdGhleVxuICAvLyBhcmUgbmFtZWQ/XG4gIGNvbnN0IHNjcmlwdHMgPSBnZXROZ0FwZlNjcmlwdHMocGtnKTtcbiAgY29uc3QgZGVwcyA9IFtwa2ddLmNvbmNhdChwa2cuX2RlcGVuZGVuY2llcy5maWx0ZXIoZGVwID0+IGRlcCAhPT0gcGtnICYmICFkZXAuX2lzTmVzdGVkKSk7XG5cbiAgbGV0IHNjcmlwdFN0YXJsYXJrID0gJyc7XG4gIGlmIChzY3JpcHRzLmxlbmd0aCkge1xuICAgIHNjcmlwdFN0YXJsYXJrID0gYFxuICAgICMgc3Vic2V0IG9mIHNyY3MgdGhhdCBhcmUgamF2YXNjcmlwdCBuYW1lZC1VTUQgb3IgbmFtZWQtQU1EIHNjcmlwdHNcbiAgICBzY3JpcHRzID0gW1xuICAgICAgICAke3NjcmlwdHMubWFwKChmOiBzdHJpbmcpID0+IGBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke2Z9XCIsYCkuam9pbignXFxuICAgICAgICAnKX1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgc3Jjc1N0YXJsYXJrID0gJyc7XG4gIGlmIChzb3VyY2VzLmxlbmd0aCkge1xuICAgIHNyY3NTdGFybGFyayA9IGBcbiAgICAjICR7cGtnLl9kaXJ9IHBhY2thZ2UgZmlsZXMgKGFuZCBmaWxlcyBpbiBuZXN0ZWQgbm9kZV9tb2R1bGVzKVxuICAgIHNyY3MgPSBbXG4gICAgICAgICR7c291cmNlcy5tYXAoKGY6IHN0cmluZykgPT4gYFwiLy86bm9kZV9tb2R1bGVzLyR7cGtnLl9kaXJ9LyR7Zn1cIixgKS5qb2luKCdcXG4gICAgICAgICcpfVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBkZXBzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGRlcHMubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IGRlcHMubWFwKGRlcCA9PiBgXCIvLyR7ZGVwLl9kaXJ9OiR7ZGVwLl9uYW1lfV9fY29udGVudHNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIGRlcHNTdGFybGFyayA9IGBcbiAgICAjIGZsYXR0ZW5lZCBsaXN0IG9mIGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgaG9pc3RlZCB0byByb290IGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXJcbiAgICBkZXBzID0gW1xuICAgICAgICAke2xpc3R9XG4gICAgXSxgO1xuICB9XG5cbiAgbGV0IGR0c1N0YXJsYXJrID0gJyc7XG4gIGlmIChkdHNTb3VyY2VzLmxlbmd0aCkge1xuICAgIGR0c1N0YXJsYXJrID0gYFxuICAgICMgJHtwa2cuX2Rpcn0gcGFja2FnZSBkZWNsYXJhdGlvbiBmaWxlcyAoYW5kIGRlY2xhcmF0aW9uIGZpbGVzIGluIG5lc3RlZCBub2RlX21vZHVsZXMpXG4gICAgc3JjcyA9IFtcbiAgICAgICAgJHtkdHNTb3VyY2VzLm1hcChmID0+IGBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke2Z9XCIsYCkuam9pbignXFxuICAgICAgICAnKX1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgcmVzdWx0ID1cbiAgICAgIGBsb2FkKFwiQGJ1aWxkX2JhemVsX3J1bGVzX25vZGVqcy8vaW50ZXJuYWwvbnBtX2luc3RhbGw6bm9kZV9tb2R1bGVfbGlicmFyeS5iemxcIiwgXCJub2RlX21vZHVsZV9saWJyYXJ5XCIpXG5cbiMgR2VuZXJhdGVkIHRhcmdldHMgZm9yIG5wbSBwYWNrYWdlIFwiJHtwa2cuX2Rpcn1cIlxuJHtwcmludEpzb24ocGtnKX1cblxuZmlsZWdyb3VwKFxuICAgIG5hbWUgPSBcIiR7cGtnLl9uYW1lfV9fZmlsZXNcIiwke3NyY3NTdGFybGFya31cbilcblxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1cIixcbiAgICAjIGRpcmVjdCBzb3VyY2VzIGxpc3RlZCBmb3Igc3RyaWN0IGRlcHMgc3VwcG9ydFxuICAgIHNyY3MgPSBbXCI6JHtwa2cuX25hbWV9X19maWxlc1wiXSwke2RlcHNTdGFybGFya31cbilcblxuIyAke3BrZy5fbmFtZX1fX2NvbnRlbnRzIHRhcmdldCBpcyB1c2VkIGFzIGRlcCBmb3IgbWFpbiB0YXJnZXRzIHRvIHByZXZlbnRcbiMgY2lyY3VsYXIgZGVwZW5kZW5jaWVzIGVycm9yc1xubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1fX2NvbnRlbnRzXCIsXG4gICAgc3JjcyA9IFtcIjoke3BrZy5fbmFtZX1fX2ZpbGVzXCJdLCR7c2NyaXB0U3Rhcmxhcmt9XG4pXG5cbiMgJHtwa2cuX25hbWV9X190eXBpbmdzIGlzIHRoZSBzdWJzZXQgb2YgJHtwa2cuX25hbWV9X19jb250ZW50cyB0aGF0IGFyZSBkZWNsYXJhdGlvbnNcbm5vZGVfbW9kdWxlX2xpYnJhcnkoXG4gICAgbmFtZSA9IFwiJHtwa2cuX25hbWV9X190eXBpbmdzXCIsJHtkdHNTdGFybGFya31cbilcblxuYDtcblxuICBsZXQgbWFpbkVudHJ5UG9pbnQgPSByZXNvbHZlUGtnTWFpbkZpbGUocGtnKVxuXG4gIC8vIGFkZCBhbiBgbnBtX3VtZF9idW5kbGVgIHRhcmdldCB0byBnZW5lcmF0ZSBhbiBVTUQgYnVuZGxlIGlmIG9uZSBkb2VzXG4gIC8vIG5vdCBleGlzdHNcbiAgaWYgKG1haW5FbnRyeVBvaW50ICYmICFmaW5kRmlsZShwa2csIGAke3BrZy5fbmFtZX0udW1kLmpzYCkpIHtcbiAgICByZXN1bHQgKz1cbiAgICAgICAgYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy9pbnRlcm5hbC9ucG1faW5zdGFsbDpucG1fdW1kX2J1bmRsZS5iemxcIiwgXCJucG1fdW1kX2J1bmRsZVwiKVxuXG5ucG1fdW1kX2J1bmRsZShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1fX3VtZFwiLFxuICAgIHBhY2thZ2VfbmFtZSA9IFwiJHtwa2cuX25hbWV9XCIsXG4gICAgZW50cnlfcG9pbnQgPSBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke21haW5FbnRyeVBvaW50fVwiLFxuICAgIHBhY2thZ2UgPSBcIjoke3BrZy5fbmFtZX1cIixcbilcblxuYDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIF9maW5kRXhlY3V0YWJsZXMocGtnOiBEZXApIHtcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBuZXcgTWFwKCk7XG5cbiAgLy8gRm9yIHJvb3QgcGFja2FnZXMsIHRyYW5zZm9ybSB0aGUgcGtnLmJpbiBlbnRyaWVzXG4gIC8vIGludG8gYSBuZXcgTWFwIGNhbGxlZCBfZXhlY3V0YWJsZXNcbiAgLy8gTk9URTogd2UgZG8gdGhpcyBvbmx5IGZvciBub24tZW1wdHkgYmluIHBhdGhzXG4gIGlmIChpc1ZhbGlkQmluUGF0aChwa2cuYmluKSkge1xuICAgIGlmICghcGtnLl9pc05lc3RlZCkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGtnLmJpbikpIHtcbiAgICAgICAgaWYgKHBrZy5iaW4ubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBleGVjdXRhYmxlcy5zZXQocGtnLl9kaXIsIGNsZWFudXBCaW5QYXRoKHBrZy5iaW5bMF0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzaG91bGQgbm90IGhhcHBlbiwgYnV0IGlnbm9yZSBpdCBpZiBwcmVzZW50XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBrZy5iaW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGV4ZWN1dGFibGVzLnNldChwa2cuX2RpciwgY2xlYW51cEJpblBhdGgocGtnLmJpbikpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGtnLmJpbiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHBrZy5iaW4pIHtcbiAgICAgICAgICBpZiAoaXNWYWxpZEJpblBhdGhTdHJpbmdWYWx1ZShwa2cuYmluW2tleV0pKSB7XG4gICAgICAgICAgICBleGVjdXRhYmxlcy5zZXQoa2V5LCBjbGVhbnVwQmluUGF0aChwa2cuYmluW2tleV0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZXhlY3V0YWJsZXM7XG59XG5cbi8vIEhhbmRsZSBhZGRpdGlvbmFsQXR0cmlidXRlcyBvZiBmb3JtYXQ6XG4vLyBgYGBcbi8vIFwiYmF6ZWxCaW5cIjoge1xuLy8gICBcIm5nYy13cmFwcGVkXCI6IHtcbi8vICAgICBcImFkZGl0aW9uYWxBdHRyaWJ1dGVzXCI6IHtcbi8vICAgICAgIFwiY29uZmlndXJhdGlvbl9lbnZfdmFyc1wiOiBcIltcXFwiY29tcGlsZVxcXCJdXCJcbi8vICAgfVxuLy8gfSxcbi8vIGBgYFxuZnVuY3Rpb24gYWRkaXRpb25hbEF0dHJpYnV0ZXMocGtnOiBEZXAsIG5hbWU6IHN0cmluZykge1xuICBsZXQgYWRkaXRpb25hbEF0dHJpYnV0ZXMgPSAnJztcbiAgaWYgKHBrZy5iYXplbEJpbiAmJiBwa2cuYmF6ZWxCaW5bbmFtZV0gJiYgcGtnLmJhemVsQmluW25hbWVdLmFkZGl0aW9uYWxBdHRyaWJ1dGVzKSB7XG4gICAgY29uc3QgYXR0cnMgPSBwa2cuYmF6ZWxCaW5bbmFtZV0uYWRkaXRpb25hbEF0dHJpYnV0ZXM7XG4gICAgZm9yIChjb25zdCBhdHRyTmFtZSBvZiBPYmplY3Qua2V5cyhhdHRycykpIHtcbiAgICAgIGNvbnN0IGF0dHJWYWx1ZSA9IGF0dHJzW2F0dHJOYW1lXTtcbiAgICAgIGFkZGl0aW9uYWxBdHRyaWJ1dGVzICs9IGBcXG4gICAgJHthdHRyTmFtZX0gPSAke2F0dHJWYWx1ZX0sYDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFkZGl0aW9uYWxBdHRyaWJ1dGVzO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgcGtnLCByZXR1cm4gdGhlIHNreWxhcmsgbm9kZWpzX2JpbmFyeSB0YXJnZXRzIGZvciB0aGUgcGFja2FnZS5cbiAqL1xuZnVuY3Rpb24gcHJpbnRQYWNrYWdlQmluKHBrZzogRGVwKSB7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBfZmluZEV4ZWN1dGFibGVzKHBrZyk7XG4gIGlmIChleGVjdXRhYmxlcy5zaXplKSB7XG4gICAgcmVzdWx0ID0gYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy86aW5kZXguYnpsXCIsIFwibm9kZWpzX2JpbmFyeVwiKVxuXG5gO1xuICAgIGNvbnN0IGRhdGEgPSBbYC8vJHtwa2cuX2Rpcn06JHtwa2cuX25hbWV9YF07XG4gICAgaWYgKHBrZy5fZHluYW1pY0RlcGVuZGVuY2llcykge1xuICAgICAgZGF0YS5wdXNoKC4uLnBrZy5fZHluYW1pY0RlcGVuZGVuY2llcyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgcGF0aF0gb2YgZXhlY3V0YWJsZXMuZW50cmllcygpKSB7XG4gICAgICByZXN1bHQgKz0gYCMgV2lyZSB1cCB0aGUgXFxgYmluXFxgIGVudHJ5IFxcYCR7bmFtZX1cXGBcbm5vZGVqc19iaW5hcnkoXG4gICAgbmFtZSA9IFwiJHtuYW1lfVwiLFxuICAgIGVudHJ5X3BvaW50ID0gXCIvLzpub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtwYXRofVwiLFxuICAgIGluc3RhbGxfc291cmNlX21hcF9zdXBwb3J0ID0gRmFsc2UsXG4gICAgZGF0YSA9IFske2RhdGEubWFwKHAgPT4gYFwiJHtwfVwiYCkuam9pbignLCAnKX1dLCR7YWRkaXRpb25hbEF0dHJpYnV0ZXMocGtnLCBuYW1lKX1cbilcblxuYDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBwcmludEluZGV4QnpsKHBrZzogRGVwKSB7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBfZmluZEV4ZWN1dGFibGVzKHBrZyk7XG4gIGlmIChleGVjdXRhYmxlcy5zaXplKSB7XG4gICAgcmVzdWx0ID0gYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy86aW5kZXguYnpsXCIsIFwibm9kZWpzX2JpbmFyeVwiLCBcIm5wbV9wYWNrYWdlX2JpblwiKVxuXG5gO1xuICAgIGNvbnN0IGRhdGEgPSBbYEAke1dPUktTUEFDRX0vLyR7cGtnLl9kaXJ9OiR7cGtnLl9uYW1lfWBdO1xuICAgIGlmIChwa2cuX2R5bmFtaWNEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGRhdGEucHVzaCguLi5wa2cuX2R5bmFtaWNEZXBlbmRlbmNpZXMpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIHBhdGhdIG9mIGV4ZWN1dGFibGVzLmVudHJpZXMoKSkge1xuICAgICAgcmVzdWx0ID0gYCR7cmVzdWx0fVxuXG4jIEdlbmVyYXRlZCBoZWxwZXIgbWFjcm8gdG8gY2FsbCAke25hbWV9XG5kZWYgJHtuYW1lLnJlcGxhY2UoLy0vZywgJ18nKX0oKiprd2FyZ3MpOlxuICAgIG91dHB1dF9kaXIgPSBrd2FyZ3MucG9wKFwib3V0cHV0X2RpclwiLCBGYWxzZSlcbiAgICBpZiBcIm91dHNcIiBpbiBrd2FyZ3Mgb3Igb3V0cHV0X2RpcjpcbiAgICAgICAgbnBtX3BhY2thZ2VfYmluKHRvb2wgPSBcIkAke1dPUktTUEFDRX0vLyR7cGtnLl9kaXJ9L2Jpbjoke1xuICAgICAgICAgIG5hbWV9XCIsIG91dHB1dF9kaXIgPSBvdXRwdXRfZGlyLCAqKmt3YXJncylcbiAgICBlbHNlOlxuICAgICAgICBub2RlanNfYmluYXJ5KFxuICAgICAgICAgICAgZW50cnlfcG9pbnQgPSBcIkAke1dPUktTUEFDRX0vLzpub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtwYXRofVwiLFxuICAgICAgICAgICAgaW5zdGFsbF9zb3VyY2VfbWFwX3N1cHBvcnQgPSBGYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBbJHtkYXRhLm1hcChwID0+IGBcIiR7cH1cImApLmpvaW4oJywgJyl9XSArIGt3YXJncy5wb3AoXCJkYXRhXCIsIFtdKSwke1xuICAgICAgICAgIGFkZGl0aW9uYWxBdHRyaWJ1dGVzKHBrZywgbmFtZSl9XG4gICAgICAgICAgICAqKmt3YXJnc1xuICAgICAgICApXG4gIGA7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbnR5cGUgRGVwID0ge1xuICBfZGlyOiBzdHJpbmcsXG4gIF9pc05lc3RlZDogYm9vbGVhbixcbiAgX2RlcGVuZGVuY2llczogRGVwW10sXG4gIF9maWxlczogc3RyaW5nW10sXG4gIFtrOiBzdHJpbmddOiBhbnlcbn1cblxuLyoqXG4gKiBHaXZlbiBhIHNjb3BlLCByZXR1cm4gdGhlIHNreWxhcmsgYG5vZGVfbW9kdWxlX2xpYnJhcnlgIHRhcmdldCBmb3IgdGhlIHNjb3BlLlxuICovXG5mdW5jdGlvbiBwcmludFNjb3BlKHNjb3BlOiBzdHJpbmcsIHBrZ3M6IERlcFtdKSB7XG4gIHBrZ3MgPSBwa2dzLmZpbHRlcihwa2cgPT4gIXBrZy5faXNOZXN0ZWQgJiYgcGtnLl9kaXIuc3RhcnRzV2l0aChgJHtzY29wZX0vYCkpO1xuICBsZXQgZGVwczogRGVwW10gPSBbXTtcbiAgcGtncy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgZGVwcyA9IGRlcHMuY29uY2F0KHBrZy5fZGVwZW5kZW5jaWVzLmZpbHRlcihkZXAgPT4gIWRlcC5faXNOZXN0ZWQgJiYgIXBrZ3MuaW5jbHVkZXMocGtnKSkpO1xuICB9KTtcbiAgLy8gZmlsdGVyIG91dCBkdXBsaWNhdGUgZGVwc1xuICBkZXBzID0gWy4uLnBrZ3MsIC4uLm5ldyBTZXQoZGVwcyldO1xuXG4gIGxldCBzcmNzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGRlcHMubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IGRlcHMubWFwKGRlcCA9PiBgXCIvLyR7ZGVwLl9kaXJ9OiR7ZGVwLl9uYW1lfV9fZmlsZXNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIHNyY3NTdGFybGFyayA9IGBcbiAgICAjIGRpcmVjdCBzb3VyY2VzIGxpc3RlZCBmb3Igc3RyaWN0IGRlcHMgc3VwcG9ydFxuICAgIHNyY3MgPSBbXG4gICAgICAgICR7bGlzdH1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgZGVwc1N0YXJsYXJrID0gJyc7XG4gIGlmIChkZXBzLmxlbmd0aCkge1xuICAgIGNvbnN0IGxpc3QgPSBkZXBzLm1hcChkZXAgPT4gYFwiLy8ke2RlcC5fZGlyfToke2RlcC5fbmFtZX1fX2NvbnRlbnRzXCIsYCkuam9pbignXFxuICAgICAgICAnKTtcbiAgICBkZXBzU3RhcmxhcmsgPSBgXG4gICAgIyBmbGF0dGVuZWQgbGlzdCBvZiBkaXJlY3QgYW5kIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIGhvaXN0ZWQgdG8gcm9vdCBieSB0aGUgcGFja2FnZSBtYW5hZ2VyXG4gICAgZGVwcyA9IFtcbiAgICAgICAgJHtsaXN0fVxuICAgIF0sYDtcbiAgfVxuXG4gIHJldHVybiBgbG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvL2ludGVybmFsL25wbV9pbnN0YWxsOm5vZGVfbW9kdWxlX2xpYnJhcnkuYnpsXCIsIFwibm9kZV9tb2R1bGVfbGlicmFyeVwiKVxuXG4jIEdlbmVyYXRlZCB0YXJnZXQgZm9yIG5wbSBzY29wZSAke3Njb3BlfVxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3Njb3BlfVwiLCR7c3Jjc1N0YXJsYXJrfSR7ZGVwc1N0YXJsYXJrfVxuKVxuXG5gO1xufVxuIl19