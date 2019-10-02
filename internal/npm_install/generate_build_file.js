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
            p._dynamicDependencies = pkgs.filter(x => !!x._moduleName && match(x._moduleName, p))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVfYnVpbGRfZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL25wbV9pbnN0YWxsL2dlbmVyYXRlX2J1aWxkX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0lBQUE7Ozs7Ozs7Ozs7Ozs7OztPQWVHO0lBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDSCxZQUFZLENBQUM7O0lBR2IseUJBQXlCO0lBQ3pCLDZCQUE2QjtJQUM3QixpQ0FBaUM7SUFFakMsU0FBUyxXQUFXLENBQUMsR0FBRyxDQUFRO1FBQzlCLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCxNQUFNLGlCQUFpQixHQUFHOzs7Ozs7Q0FNekIsQ0FBQTtJQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUIsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3pELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFB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QUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsNEJBQTRCO1FBQzVCLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVuQyxJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEYsWUFBWSxHQUFHOzs7VUFHVCxJQUFJO09BQ1AsQ0FBQztTQUNMO1FBRUQsSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNGLFlBQVksR0FBRzs7O1VBR1QsSUFBSTtPQUNQLENBQUM7U0FDTDtRQUVELE9BQU87O21DQUUwQixLQUFLOztjQUUxQixLQUFLLEtBQUssWUFBWSxHQUFHLFlBQVk7OztDQUdsRCxDQUFDO0lBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IFRoZSBCYXplbCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFRoaXMgc2NyaXB0IGdlbmVyYXRlcyBCVUlMRC5iYXplbCBmaWxlcyBieSBhbmFseXppbmdcbiAqIHRoZSBub2RlX21vZHVsZXMgZm9sZGVyIGxheWVkIG91dCBieSB5YXJuIG9yIG5wbS4gSXQgZ2VuZXJhdGVzXG4gKiBmaW5lIGdyYWluZWQgQmF6ZWwgYG5vZGVfbW9kdWxlX2xpYnJhcnlgIHRhcmdldHMgZm9yIGVhY2ggcm9vdCBucG0gcGFja2FnZVxuICogYW5kIGFsbCBmaWxlcyBmb3IgdGhhdCBwYWNrYWdlIGFuZCBpdHMgdHJhbnNpdGl2ZSBkZXBzIGFyZSBpbmNsdWRlZFxuICogaW4gdGhlIHRhcmdldC4gRm9yIGV4YW1wbGUsIGBAPHdvcmtzcGFjZT4vL2phc21pbmVgIHdvdWxkXG4gKiBpbmNsdWRlIGFsbCBmaWxlcyBpbiB0aGUgamFzbWluZSBucG0gcGFja2FnZSBhbmQgYWxsIG9mIGl0c1xuICogdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMuXG4gKlxuICogbm9kZWpzX2JpbmFyeSB0YXJnZXRzIGFyZSBhbHNvIGdlbmVyYXRlZCBmb3IgYWxsIGBiaW5gIHNjcmlwdHNcbiAqIGluIGVhY2ggcGFja2FnZS4gRm9yIGV4YW1wbGUsIHRoZSBgQDx3b3Jrc3BhY2U+Ly9qYXNtaW5lL2JpbjpqYXNtaW5lYFxuICogdGFyZ2V0IHdpbGwgYmUgZ2VuZXJhdGVkIGZvciB0aGUgYGphc21pbmVgIGJpbmFyeSBpbiB0aGUgYGphc21pbmVgXG4gKiBucG0gcGFja2FnZS5cbiAqXG4gKiBBZGRpdGlvbmFsbHksIGEgYEA8d29ya3NwYWNlPi8vOm5vZGVfbW9kdWxlc2AgYG5vZGVfbW9kdWxlX2xpYnJhcnlgXG4gKiBpcyBnZW5lcmF0ZWQgdGhhdCBpbmNsdWRlcyBhbGwgcGFja2FnZXMgdW5kZXIgbm9kZV9tb2R1bGVzXG4gKiBhcyB3ZWxsIGFzIHRoZSAuYmluIGZvbGRlci5cbiAqXG4gKiBUaGlzIHdvcmsgaXMgYmFzZWQgb2ZmIHRoZSBmaW5lIGdyYWluZWQgZGVwcyBjb25jZXB0cyBpblxuICogaHR0cHM6Ly9naXRodWIuY29tL3B1YnJlZi9ydWxlc19ub2RlIGRldmVsb3BlZCBieSBAcGNqLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xQWZqSE1MVnlFX3ZZd2xIU0s3azd5V19JSUdwcFN4c1F0UG05UFRyMXhFb1xuICovXG4ndXNlIHN0cmljdCc7XG5cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuXG5mdW5jdGlvbiBsb2dfdmVyYm9zZSguLi5tOiBhbnlbXSkge1xuICBpZiAoISFwcm9jZXNzLmVudlsnVkVSQk9TRV9MT0dTJ10pIGNvbnNvbGUuZXJyb3IoJ1tnZW5lcmF0ZV9idWlsZF9maWxlLmpzXScsIC4uLm0pO1xufVxuXG5jb25zdCBCVUlMRF9GSUxFX0hFQURFUiA9IGAjIEdlbmVyYXRlZCBmaWxlIGZyb20geWFybl9pbnN0YWxsL25wbV9pbnN0YWxsIHJ1bGUuXG4jIFNlZSAkKGJhemVsIGluZm8gb3V0cHV0X2Jhc2UpL2V4dGVybmFsL2J1aWxkX2JhemVsX3J1bGVzX25vZGVqcy9pbnRlcm5hbC9ucG1faW5zdGFsbC9nZW5lcmF0ZV9idWlsZF9maWxlLmpzXG5cbiMgQWxsIHJ1bGVzIGluIG90aGVyIHJlcG9zaXRvcmllcyBjYW4gdXNlIHRoZXNlIHRhcmdldHNcbnBhY2thZ2UoZGVmYXVsdF92aXNpYmlsaXR5ID0gW1wiLy92aXNpYmlsaXR5OnB1YmxpY1wiXSlcblxuYFxuXG5jb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuY29uc3QgV09SS1NQQUNFID0gYXJnc1swXTtcbmNvbnN0IFJVTEVfVFlQRSA9IGFyZ3NbMV07XG5jb25zdCBFUlJPUl9PTl9CQVpFTF9GSUxFUyA9IHBhcnNlSW50KGFyZ3NbMl0pO1xuY29uc3QgTE9DS19GSUxFX1BBVEggPSBhcmdzWzNdO1xuY29uc3QgSU5DTFVERURfRklMRVMgPSBhcmdzWzRdID8gYXJnc1s0XS5zcGxpdCgnLCcpIDogW107XG5jb25zdCBEWU5BTUlDX0RFUFMgPSBKU09OLnBhcnNlKGFyZ3NbNV0gfHwgJ3t9Jyk7XG5cbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBtYWluKCk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGRpcmVjdG9yeSBhbmQgYW55IG5lY2Vzc2FyeSBzdWJkaXJlY3Rvcmllc1xuICogaWYgdGhleSBkbyBub3QgZXhpc3QuXG4gKi9cbmZ1bmN0aW9uIG1rZGlycChwOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHApKSB7XG4gICAgbWtkaXJwKHBhdGguZGlybmFtZShwKSk7XG4gICAgZnMubWtkaXJTeW5jKHApO1xuICB9XG59XG5cbi8qKlxuICogV3JpdGVzIGEgZmlsZSwgZmlyc3QgZW5zdXJpbmcgdGhhdCB0aGUgZGlyZWN0b3J5IHRvXG4gKiB3cml0ZSB0byBleGlzdHMuXG4gKi9cbmZ1bmN0aW9uIHdyaXRlRmlsZVN5bmMocDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgbWtkaXJwKHBhdGguZGlybmFtZShwKSk7XG4gIGZzLndyaXRlRmlsZVN5bmMocCwgY29udGVudCk7XG59XG5cbi8qKlxuICogTWFpbiBlbnRyeXBvaW50LlxuICovXG5mdW5jdGlvbiBtYWluKCkge1xuICAvLyBmaW5kIGFsbCBwYWNrYWdlcyAoaW5jbHVkaW5nIHBhY2thZ2VzIGluIG5lc3RlZCBub2RlX21vZHVsZXMpXG4gIGNvbnN0IHBrZ3MgPSBmaW5kUGFja2FnZXMoKTtcblxuICAvLyBmbGF0dGVuIGRlcGVuZGVuY2llc1xuICBmbGF0dGVuRGVwZW5kZW5jaWVzKHBrZ3MpO1xuXG4gIC8vIGdlbmVyYXRlIEJhemVsIHdvcmtzcGFjZXNcbiAgZ2VuZXJhdGVCYXplbFdvcmtzcGFjZXMocGtncylcblxuICAvLyBnZW5lcmF0ZSBhbGwgQlVJTEQgZmlsZXNcbiAgZ2VuZXJhdGVCdWlsZEZpbGVzKHBrZ3MpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtYWluLFxuICBwcmludFBhY2thZ2VCaW4sXG4gIGFkZER5bmFtaWNEZXBlbmRlbmNpZXMsXG4gIHByaW50SW5kZXhCemwsXG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhbGwgYnVpbGQgZmlsZXNcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVCdWlsZEZpbGVzKHBrZ3M6IERlcFtdKSB7XG4gIGdlbmVyYXRlUm9vdEJ1aWxkRmlsZShwa2dzLmZpbHRlcihwa2cgPT4gIXBrZy5faXNOZXN0ZWQpKVxuICBwa2dzLmZpbHRlcihwa2cgPT4gIXBrZy5faXNOZXN0ZWQpLmZvckVhY2gocGtnID0+IGdlbmVyYXRlUGFja2FnZUJ1aWxkRmlsZXMocGtnKSk7XG4gIGZpbmRTY29wZXMoKS5mb3JFYWNoKHNjb3BlID0+IGdlbmVyYXRlU2NvcGVCdWlsZEZpbGVzKHNjb3BlLCBwa2dzKSk7XG59XG5cbi8qKlxuICogRmxhdHRlbnMgZGVwZW5kZW5jaWVzIG9uIGFsbCBwYWNrYWdlc1xuICovXG5mdW5jdGlvbiBmbGF0dGVuRGVwZW5kZW5jaWVzKHBrZ3M6IERlcFtdKSB7XG4gIGNvbnN0IHBrZ3NNYXAgPSBuZXcgTWFwKCk7XG4gIHBrZ3MuZm9yRWFjaChwa2cgPT4gcGtnc01hcC5zZXQocGtnLl9kaXIsIHBrZykpO1xuICBwa2dzLmZvckVhY2gocGtnID0+IGZsYXR0ZW5Qa2dEZXBlbmRlbmNpZXMocGtnLCBwa2csIHBrZ3NNYXApKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIEJhemVsIGZpbGVzIGluIG5wbSBkaXN0cmlidXRpb25zLlxuICovXG5mdW5jdGlvbiBoaWRlQmF6ZWxGaWxlcyhwa2c6IERlcCkge1xuICBjb25zdCBoYXNIaWRlQmF6ZWxGaWxlcyA9IGlzRGlyZWN0b3J5KCdub2RlX21vZHVsZXMvQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXMnKTtcbiAgcGtnLl9maWxlcyA9IHBrZy5fZmlsZXMubWFwKGZpbGUgPT4ge1xuICAgIGNvbnN0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKTtcbiAgICBjb25zdCBiYXNlbmFtZVVjID0gYmFzZW5hbWUudG9VcHBlckNhc2UoKTtcbiAgICBpZiAoYmFzZW5hbWVVYyA9PT0gJ0JVSUxEJyB8fCBiYXNlbmFtZVVjID09PSAnQlVJTEQuQkFaRUwnKSB7XG4gICAgICAvLyBJZiBiYXplbCBmaWxlcyBhcmUgZGV0ZWN0ZWQgYW5kIHRoZXJlIGlzIG5vIEBiYXplbC9oaWRlLWJhemVsLWZpbGVzIG5wbVxuICAgICAgLy8gcGFja2FnZSB0aGVuIGVycm9yIG91dCBhbmQgc3VnZ2VzdCBhZGRpbmcgdGhlIHBhY2thZ2UuIEl0IGlzIHBvc3NpYmxlIHRvXG4gICAgICAvLyBoYXZlIGJhemVsIEJVSUxEIGZpbGVzIHdpdGggdGhlIHBhY2thZ2UgaW5zdGFsbGVkIGFzIGl0J3MgcG9zdGluc3RhbGxcbiAgICAgIC8vIHN0ZXAsIHdoaWNoIGhpZGVzIGJhemVsIEJVSUxEIGZpbGVzLCBvbmx5IHJ1bnMgd2hlbiB0aGUgQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXNcbiAgICAgIC8vIGlzIGluc3RhbGxlZCBhbmQgbm90IHdoZW4gbmV3IHBhY2thZ2VzIGFyZSBhZGRlZCAodmlhIGB5YXJuIGFkZGBcbiAgICAgIC8vIGZvciBleGFtcGxlKSBhZnRlciB0aGUgaW5pdGlhbCBpbnN0YWxsLiBJbiB0aGlzIGNhc2UsIGhvd2V2ZXIsIHRoZSByZXBvIHJ1bGVcbiAgICAgIC8vIHdpbGwgcmUtcnVuIGFzIHRoZSBwYWNrYWdlLmpzb24gJiYgbG9jayBmaWxlIGhhcyBjaGFuZ2VkIHNvIHdlIGp1c3RcbiAgICAgIC8vIGhpZGUgdGhlIGFkZGVkIEJVSUxEIGZpbGVzIGR1cmluZyB0aGUgcmVwbyBydWxlIHJ1biBoZXJlIHNpbmNlIEBiYXplbC9oaWRlLWJhemVsLWZpbGVzXG4gICAgICAvLyB3YXMgbm90IHJ1bi5cbiAgICAgIGlmICghaGFzSGlkZUJhemVsRmlsZXMgJiYgRVJST1JfT05fQkFaRUxfRklMRVMpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgbnBtIHBhY2thZ2UgJyR7cGtnLl9kaXJ9JyBmcm9tIEAke1dPUktTUEFDRX0gJHtSVUxFX1RZUEV9IHJ1bGVcbmhhcyBhIEJhemVsIEJVSUxEIGZpbGUgJyR7ZmlsZX0nLiBVc2UgdGhlIEBiYXplbC9oaWRlLWJhemVsLWZpbGVzIHV0aWxpdHkgdG8gaGlkZSB0aGVzZSBmaWxlcy5cblNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvYmxvYi9tYXN0ZXIvcGFja2FnZXMvaGlkZS1iYXplbC1maWxlcy9SRUFETUUubWRcbmZvciBpbnN0YWxsYXRpb24gaW5zdHJ1Y3Rpb25zLmApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBbGwgQmF6ZWwgZmlsZXMgaW4gdGhlIG5wbSBkaXN0cmlidXRpb24gc2hvdWxkIGJlIHJlbmFtZWQgYnlcbiAgICAgICAgLy8gYWRkaW5nIGEgYF9gIHByZWZpeCBzbyB0aGF0IGZpbGUgdGFyZ2V0cyBkb24ndCBjcm9zcyBwYWNrYWdlIGJvdW5kYXJpZXMuXG4gICAgICAgIGNvbnN0IG5ld0ZpbGUgPSBwYXRoLnBvc2l4LmpvaW4ocGF0aC5kaXJuYW1lKGZpbGUpLCBgXyR7YmFzZW5hbWV9YCk7XG4gICAgICAgIGNvbnN0IHNyY1BhdGggPSBwYXRoLnBvc2l4LmpvaW4oJ25vZGVfbW9kdWxlcycsIHBrZy5fZGlyLCBmaWxlKTtcbiAgICAgICAgY29uc3QgZHN0UGF0aCA9IHBhdGgucG9zaXguam9pbignbm9kZV9tb2R1bGVzJywgcGtnLl9kaXIsIG5ld0ZpbGUpO1xuICAgICAgICBmcy5yZW5hbWVTeW5jKHNyY1BhdGgsIGRzdFBhdGgpO1xuICAgICAgICByZXR1cm4gbmV3RmlsZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZpbGU7XG4gIH0pO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyB0aGUgcm9vdCBCVUlMRCBmaWxlLlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb3RCdWlsZEZpbGUocGtnczogRGVwW10pIHtcbiAgbGV0IGV4cG9ydHNTdGFybGFyayA9ICcnO1xuICBwa2dzLmZvckVhY2gocGtnID0+IHtwa2cuX2ZpbGVzLmZvckVhY2goZiA9PiB7XG4gICAgICAgICAgICAgICAgIGV4cG9ydHNTdGFybGFyayArPSBgICAgIFwibm9kZV9tb2R1bGVzLyR7cGtnLl9kaXJ9LyR7Zn1cIixcbmA7XG4gICAgICAgICAgICAgICB9KX0pO1xuXG4gIGxldCBzcmNzU3RhcmxhcmsgPSAnJztcbiAgaWYgKHBrZ3MubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IHBrZ3MubWFwKHBrZyA9PiBgXCIvLyR7cGtnLl9kaXJ9OiR7cGtnLl9uYW1lfV9fZmlsZXNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIHNyY3NTdGFybGFyayA9IGBcbiAgICAjIGRpcmVjdCBzb3VyY2VzIGxpc3RlZCBmb3Igc3RyaWN0IGRlcHMgc3VwcG9ydFxuICAgIHNyY3MgPSBbXG4gICAgICAgICR7bGlzdH1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgZGVwc1N0YXJsYXJrID0gJyc7XG4gIGlmIChwa2dzLmxlbmd0aCkge1xuICAgIGNvbnN0IGxpc3QgPSBwa2dzLm1hcChwa2cgPT4gYFwiLy8ke3BrZy5fZGlyfToke3BrZy5fbmFtZX1fX2NvbnRlbnRzXCIsYCkuam9pbignXFxuICAgICAgICAnKTtcbiAgICBkZXBzU3RhcmxhcmsgPSBgXG4gICAgIyBmbGF0dGVuZWQgbGlzdCBvZiBkaXJlY3QgYW5kIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIGhvaXN0ZWQgdG8gcm9vdCBieSB0aGUgcGFja2FnZSBtYW5hZ2VyXG4gICAgZGVwcyA9IFtcbiAgICAgICAgJHtsaXN0fVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBidWlsZEZpbGUgPSBCVUlMRF9GSUxFX0hFQURFUiArXG4gICAgICBgbG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvL2ludGVybmFsL25wbV9pbnN0YWxsOm5vZGVfbW9kdWxlX2xpYnJhcnkuYnpsXCIsIFwibm9kZV9tb2R1bGVfbGlicmFyeVwiKVxuXG5leHBvcnRzX2ZpbGVzKFtcbiR7ZXhwb3J0c1N0YXJsYXJrfV0pXG5cbiMgVGhlIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaW4gb25lIGNhdGNoLWFsbCBub2RlX21vZHVsZV9saWJyYXJ5LlxuIyBOQjogVXNpbmcgdGhpcyB0YXJnZXQgbWF5IGhhdmUgYmFkIHBlcmZvcm1hbmNlIGltcGxpY2F0aW9ucyBpZlxuIyB0aGVyZSBhcmUgbWFueSBmaWxlcyBpbiB0YXJnZXQuXG4jIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvNTE1My5cbm5vZGVfbW9kdWxlX2xpYnJhcnkoXG4gICAgbmFtZSA9IFwibm9kZV9tb2R1bGVzXCIsJHtzcmNzU3Rhcmxhcmt9JHtkZXBzU3Rhcmxhcmt9XG4pXG5cbmBcblxuICAvLyBBZGQgdGhlIG1hbnVhbCBidWlsZCBmaWxlIGNvbnRlbnRzIGlmIHRoZXkgZXhpc3RzXG4gIHRyeSB7XG4gICAgYnVpbGRGaWxlICs9IGZzLnJlYWRGaWxlU3luYyhgbWFudWFsX2J1aWxkX2ZpbGVfY29udGVudHNgLCB7ZW5jb2Rpbmc6ICd1dGY4J30pO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cblxuICB3cml0ZUZpbGVTeW5jKCdCVUlMRC5iYXplbCcsIGJ1aWxkRmlsZSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGFsbCBCVUlMRCAmIGJ6bCBmaWxlcyBmb3IgYSBwYWNrYWdlLlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVBhY2thZ2VCdWlsZEZpbGVzKHBrZzogRGVwKSB7XG4gIGxldCBidWlsZEZpbGUgPSBwcmludFBhY2thZ2UocGtnKTtcblxuICBjb25zdCBiaW5CdWlsZEZpbGUgPSBwcmludFBhY2thZ2VCaW4ocGtnKTtcbiAgaWYgKGJpbkJ1aWxkRmlsZS5sZW5ndGgpIHtcbiAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgICBwYXRoLnBvc2l4LmpvaW4ocGtnLl9kaXIsICdiaW4nLCAnQlVJTEQuYmF6ZWwnKSwgQlVJTERfRklMRV9IRUFERVIgKyBiaW5CdWlsZEZpbGUpO1xuICB9XG5cbiAgY29uc3QgaW5kZXhGaWxlID0gcHJpbnRJbmRleEJ6bChwa2cpO1xuICBpZiAoaW5kZXhGaWxlLmxlbmd0aCkge1xuICAgIHdyaXRlRmlsZVN5bmMocGF0aC5wb3NpeC5qb2luKHBrZy5fZGlyLCAnaW5kZXguYnpsJyksIGluZGV4RmlsZSk7XG4gICAgYnVpbGRGaWxlID0gYCR7YnVpbGRGaWxlfVxuIyBGb3IgaW50ZWdyYXRpb24gdGVzdGluZ1xuZXhwb3J0c19maWxlcyhbXCJpbmRleC5iemxcIl0pXG5gO1xuICB9XG5cbiAgd3JpdGVGaWxlU3luYyhwYXRoLnBvc2l4LmpvaW4ocGtnLl9kaXIsICdCVUlMRC5iYXplbCcpLCBCVUlMRF9GSUxFX0hFQURFUiArIGJ1aWxkRmlsZSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgaW5zdGFsbF88d29ya3NwYWNlX25hbWU+LmJ6bCBmaWxlcyB3aXRoIGZ1bmN0aW9uIHRvIGluc3RhbGwgZWFjaCB3b3Jrc3BhY2UuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlQmF6ZWxXb3Jrc3BhY2VzKHBrZ3M6IERlcFtdKSB7XG4gIGNvbnN0IHdvcmtzcGFjZXM6IEJhZzxzdHJpbmc+ID0ge307XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGtncykge1xuICAgIGlmICghcGtnLmJhemVsV29ya3NwYWNlcykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB3b3Jrc3BhY2Ugb2YgT2JqZWN0LmtleXMocGtnLmJhemVsV29ya3NwYWNlcykpIHtcbiAgICAgIC8vIEEgYmF6ZWwgd29ya3NwYWNlIGNhbiBvbmx5IGJlIHNldHVwIGJ5IG9uZSBucG0gcGFja2FnZVxuICAgICAgaWYgKHdvcmtzcGFjZXNbd29ya3NwYWNlXSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgYENvdWxkIG5vdCBzZXR1cCBCYXplbCB3b3Jrc3BhY2UgJHt3b3Jrc3BhY2V9IHJlcXVlc3RlZCBieSBucG0gYCArXG4gICAgICAgICAgICBgcGFja2FnZSAke3BrZy5fZGlyfUAke3BrZy52ZXJzaW9ufS4gQWxyZWFkeSBzZXR1cCBieSAke3dvcmtzcGFjZXNbd29ya3NwYWNlXX1gKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfVxuXG4gICAgICBnZW5lcmF0ZUJhemVsV29ya3NwYWNlKHBrZywgd29ya3NwYWNlKTtcblxuICAgICAgLy8gS2VlcCB0cmFjayBvZiB3aGljaCBucG0gcGFja2FnZSBzZXR1cCB0aGlzIGJhemVsIHdvcmtzcGFjZSBmb3IgbGF0ZXIgdXNlXG4gICAgICB3b3Jrc3BhY2VzW3dvcmtzcGFjZV0gPSBgJHtwa2cuX2Rpcn1AJHtwa2cudmVyc2lvbn1gO1xuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmFsbHkgZ2VuZXJhdGUgaW5zdGFsbF9iYXplbF9kZXBlbmRlbmNpZXMuYnpsXG4gIGdlbmVyYXRlSW5zdGFsbEJhemVsRGVwZW5kZW5jaWVzKE9iamVjdC5rZXlzKHdvcmtzcGFjZXMpKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBpbnN0YWxsXzx3b3Jrc3BhY2U+LmJ6bCBmaWxlIHdpdGggZnVuY3Rpb24gdG8gaW5zdGFsbCB0aGUgd29ya3NwYWNlLlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZUJhemVsV29ya3NwYWNlKHBrZzogRGVwLCB3b3Jrc3BhY2U6IHN0cmluZykge1xuICBsZXQgYnpsRmlsZSA9IGAjIEdlbmVyYXRlZCBieSB0aGUgeWFybl9pbnN0YWxsL25wbV9pbnN0YWxsIHJ1bGVcbmxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy9pbnRlcm5hbC9jb3B5X3JlcG9zaXRvcnk6Y29weV9yZXBvc2l0b3J5LmJ6bFwiLCBcImNvcHlfcmVwb3NpdG9yeVwiKVxuXG5kZWYgX21heWJlKHJlcG9fcnVsZSwgbmFtZSwgKiprd2FyZ3MpOlxuICAgIGlmIG5hbWUgbm90IGluIG5hdGl2ZS5leGlzdGluZ19ydWxlcygpOlxuICAgICAgICByZXBvX3J1bGUobmFtZSA9IG5hbWUsICoqa3dhcmdzKVxuYDtcblxuICBjb25zdCByb290UGF0aCA9IHBrZy5iYXplbFdvcmtzcGFjZXNbd29ya3NwYWNlXS5yb290UGF0aDtcbiAgaWYgKCFyb290UGF0aCkge1xuICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIGBNYWxmb3JtZWQgYmF6ZWxXb3Jrc3BhY2VzIGF0dHJpYnV0ZSBpbiAke3BrZy5fZGlyfUAke3BrZy52ZXJzaW9ufS4gYCArXG4gICAgICAgIGBNaXNzaW5nIHJvb3RQYXRoIGZvciB3b3Jrc3BhY2UgJHt3b3Jrc3BhY2V9LmApO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxuXG4gIC8vIENvcHkgYWxsIGZpbGVzIGZvciB0aGlzIHdvcmtzcGFjZSB0byBhIGZvbGRlciB1bmRlciBfd29ya3NwYWNlc1xuICAvLyB0byByZXN0b3JlIHRoZSBCYXplbCBmaWxlcyB3aGljaCBoYXZlIGJlIHJlbmFtZWQgZnJvbSB0aGUgbnBtIHBhY2thZ2VcbiAgY29uc3Qgd29ya3NwYWNlU291cmNlUGF0aCA9IHBhdGgucG9zaXguam9pbignX3dvcmtzcGFjZXMnLCB3b3Jrc3BhY2UpO1xuICBta2RpcnAod29ya3NwYWNlU291cmNlUGF0aCk7XG4gIHBrZy5fZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICBpZiAoL15ub2RlX21vZHVsZXNbL1xcXFxdLy50ZXN0KGZpbGUpKSB7XG4gICAgICAvLyBkb24ndCBjb3B5IG92ZXIgbmVzdGVkIG5vZGVfbW9kdWxlc1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgZGVzdEZpbGUgPSBwYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKTtcbiAgICBpZiAoZGVzdEZpbGUuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgICAgLy8gdGhpcyBmaWxlIGlzIG5vdCB1bmRlciB0aGUgcm9vdFBhdGhcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGUpO1xuICAgIGNvbnN0IGJhc2VuYW1lVWMgPSBiYXNlbmFtZS50b1VwcGVyQ2FzZSgpO1xuICAgIC8vIEJhemVsIEJVSUxEIGZpbGVzIGZyb20gbnBtIGRpc3RyaWJ1dGlvbiB3b3VsZCBoYXZlIGJlZW4gcmVuYW1lZCBlYXJsaWVyIHdpdGggYSBfIHByZWZpeCBzb1xuICAgIC8vIHdlIHJlc3RvcmUgdGhlIG5hbWUgb24gdGhlIGNvcHlcbiAgICBpZiAoYmFzZW5hbWVVYyA9PT0gJ19CVUlMRCcgfHwgYmFzZW5hbWVVYyA9PT0gJ19CVUlMRC5CQVpFTCcpIHtcbiAgICAgIGRlc3RGaWxlID0gcGF0aC5wb3NpeC5qb2luKHBhdGguZGlybmFtZShkZXN0RmlsZSksIGJhc2VuYW1lLnN1YnN0cigxKSk7XG4gICAgfVxuICAgIGNvbnN0IHNyYyA9IHBhdGgucG9zaXguam9pbignbm9kZV9tb2R1bGVzJywgcGtnLl9kaXIsIGZpbGUpO1xuICAgIGNvbnN0IGRlc3QgPSBwYXRoLnBvc2l4LmpvaW4od29ya3NwYWNlU291cmNlUGF0aCwgZGVzdEZpbGUpO1xuICAgIG1rZGlycChwYXRoLmRpcm5hbWUoZGVzdCkpO1xuICAgIGZzLmNvcHlGaWxlU3luYyhzcmMsIGRlc3QpO1xuICB9KTtcblxuICAvLyBXZSBjcmVhdGUgX2JhemVsX3dvcmtzcGFjZV9tYXJrZXIgdGhhdCBpcyB1c2VkIGJ5IHRoZSBjdXN0b20gY29weV9yZXBvc2l0b3J5XG4gIC8vIHJ1bGUgdG8gcmVzb2x2ZSB0aGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBzb3VyY2Ugcm9vdC4gQSByb290IEJVSUxEIGZpbGVcbiAgLy8gaXMgcmVxdWlyZWQgdG8gcmVmZXJlbmNlIF9iYXplbF93b3Jrc3BhY2VfbWFya2VyIGFzIGEgdGFyZ2V0IHNvIHdlIGFsc28gY3JlYXRlXG4gIC8vIGFuIGVtcHR5IG9uZSBpZiBvbmUgZG9lcyBub3QgZXhpc3QuXG4gIGlmICghaGFzUm9vdEJ1aWxkRmlsZShwa2csIHJvb3RQYXRoKSkge1xuICAgIHdyaXRlRmlsZVN5bmMoXG4gICAgICAgIHBhdGgucG9zaXguam9pbih3b3Jrc3BhY2VTb3VyY2VQYXRoLCAnQlVJTEQuYmF6ZWwnKSxcbiAgICAgICAgJyMgTWFya2VyIGZpbGUgdGhhdCB0aGlzIGRpcmVjdG9yeSBpcyBhIGJhemVsIHBhY2thZ2UnKTtcbiAgfVxuICBjb25zdCBzaGEyNTZzdW0gPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gIHNoYTI1NnN1bS51cGRhdGUoZnMucmVhZEZpbGVTeW5jKExPQ0tfRklMRV9QQVRILCB7ZW5jb2Rpbmc6ICd1dGY4J30pKTtcbiAgd3JpdGVGaWxlU3luYyhcbiAgICAgIHBhdGgucG9zaXguam9pbih3b3Jrc3BhY2VTb3VyY2VQYXRoLCAnX2JhemVsX3dvcmtzcGFjZV9tYXJrZXInKSxcbiAgICAgIGAjIE1hcmtlciBmaWxlIHRvIHVzZWQgYnkgY3VzdG9tIGNvcHlfcmVwb3NpdG9yeSBydWxlXFxuJHtzaGEyNTZzdW0uZGlnZXN0KCdoZXgnKX1gKTtcblxuICBiemxGaWxlICs9IGBkZWYgaW5zdGFsbF8ke3dvcmtzcGFjZX0oKTpcbiAgICBfbWF5YmUoXG4gICAgICAgIGNvcHlfcmVwb3NpdG9yeSxcbiAgICAgICAgbmFtZSA9IFwiJHt3b3Jrc3BhY2V9XCIsXG4gICAgICAgIG1hcmtlcl9maWxlID0gXCJAJHtXT1JLU1BBQ0V9Ly9fd29ya3NwYWNlcy8ke3dvcmtzcGFjZX06X2JhemVsX3dvcmtzcGFjZV9tYXJrZXJcIixcbiAgICApXG5gO1xuXG4gIHdyaXRlRmlsZVN5bmMoYGluc3RhbGxfJHt3b3Jrc3BhY2V9LmJ6bGAsIGJ6bEZpbGUpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGluc3RhbGxfYmF6ZWxfZGVwZW5kZW5jaWVzLmJ6bCB3aXRoIGZ1bmN0aW9uIHRvIGluc3RhbGwgYWxsIHdvcmtzcGFjZXMuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlSW5zdGFsbEJhemVsRGVwZW5kZW5jaWVzKHdvcmtzcGFjZXM6IHN0cmluZ1tdKSB7XG4gIGxldCBiemxGaWxlID0gYCMgR2VuZXJhdGVkIGJ5IHRoZSB5YXJuX2luc3RhbGwvbnBtX2luc3RhbGwgcnVsZVxuYDtcbiAgd29ya3NwYWNlcy5mb3JFYWNoKHdvcmtzcGFjZSA9PiB7XG4gICAgYnpsRmlsZSArPSBgbG9hZChcXFwiOmluc3RhbGxfJHt3b3Jrc3BhY2V9LmJ6bFxcXCIsIFxcXCJpbnN0YWxsXyR7d29ya3NwYWNlfVxcXCIpXG5gO1xuICB9KTtcbiAgYnpsRmlsZSArPSBgZGVmIGluc3RhbGxfYmF6ZWxfZGVwZW5kZW5jaWVzKCk6XG4gICAgXCJcIlwiSW5zdGFsbHMgYWxsIHdvcmtzcGFjZXMgbGlzdGVkIGluIGJhemVsV29ya3NwYWNlcyBvZiBhbGwgbnBtIHBhY2thZ2VzXCJcIlwiXG5gO1xuICB3b3Jrc3BhY2VzLmZvckVhY2god29ya3NwYWNlID0+IHtcbiAgICBiemxGaWxlICs9IGAgICAgaW5zdGFsbF8ke3dvcmtzcGFjZX0oKVxuYDtcbiAgfSk7XG5cbiAgd3JpdGVGaWxlU3luYygnaW5zdGFsbF9iYXplbF9kZXBlbmRlbmNpZXMuYnpsJywgYnpsRmlsZSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYnVpbGQgZmlsZXMgZm9yIGEgc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlU2NvcGVCdWlsZEZpbGVzKHNjb3BlOiBzdHJpbmcsIHBrZ3M6IERlcFtdKSB7XG4gIGNvbnN0IGJ1aWxkRmlsZSA9IEJVSUxEX0ZJTEVfSEVBREVSICsgcHJpbnRTY29wZShzY29wZSwgcGtncyk7XG4gIHdyaXRlRmlsZVN5bmMocGF0aC5wb3NpeC5qb2luKHNjb3BlLCAnQlVJTEQuYmF6ZWwnKSwgYnVpbGRGaWxlKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBwYXRoIGlzIGEgZmlsZS5cbiAqL1xuZnVuY3Rpb24gaXNGaWxlKHA6IHN0cmluZykge1xuICByZXR1cm4gZnMuZXhpc3RzU3luYyhwKSAmJiBmcy5zdGF0U3luYyhwKS5pc0ZpbGUoKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBwYXRoIGlzIGFuIG5wbSBwYWNrYWdlIHdoaWNoIGlzIGlzIGEgZGlyZWN0b3J5IHdpdGggYSBwYWNrYWdlLmpzb24gZmlsZS5cbiAqL1xuZnVuY3Rpb24gaXNEaXJlY3RvcnkocDogc3RyaW5nKSB7XG4gIHJldHVybiBmcy5leGlzdHNTeW5jKHApICYmIGZzLnN0YXRTeW5jKHApLmlzRGlyZWN0b3J5KCk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgdGhlIGZpbGVzIHVuZGVyIGEgZGlyZWN0b3J5IGFzIHJlbGF0aXZlXG4gKiBwYXRocyB0byB0aGUgZGlyZWN0b3J5LlxuICovXG5mdW5jdGlvbiBsaXN0RmlsZXMocm9vdERpcjogc3RyaW5nLCBzdWJEaXI6IHN0cmluZyA9ICcnKTogc3RyaW5nW10ge1xuICBjb25zdCBkaXIgPSBwYXRoLnBvc2l4LmpvaW4ocm9vdERpciwgc3ViRGlyKTtcbiAgaWYgKCFpc0RpcmVjdG9yeShkaXIpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhkaXIpXG4gICAgICAucmVkdWNlKFxuICAgICAgICAgIChmaWxlczogc3RyaW5nW10sIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5wb3NpeC5qb2luKGRpciwgZmlsZSk7XG4gICAgICAgICAgICBjb25zdCByZWxQYXRoID0gcGF0aC5wb3NpeC5qb2luKHN1YkRpciwgZmlsZSk7XG4gICAgICAgICAgICBjb25zdCBpc1N5bWJvbGljTGluayA9IGZzLmxzdGF0U3luYyhmdWxsUGF0aCkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgICAgICAgICAgIGxldCBzdGF0O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgaWYgKGlzU3ltYm9saWNMaW5rKSB7XG4gICAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBicm9rZW4gc3ltYm9saWMgbGlua3MuIFRoZXNlIGNhdXNlIGZzLnN0YXRTeW5jKGZ1bGxQYXRoKVxuICAgICAgICAgICAgICAgIC8vIHRvIGZhaWwgd2l0aCBgRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5IC4uLmBcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGlzRGlyZWN0b3J5ID0gc3RhdC5pc0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgaWYgKGlzRGlyZWN0b3J5ICYmIGlzU3ltYm9saWNMaW5rKSB7XG4gICAgICAgICAgICAgIC8vIEZpbHRlciBvdXQgc3ltYm9saWMgbGlua3MgdG8gZGlyZWN0b3JpZXMuIEFuIGlzc3VlIGluIHlhcm4gdmVyc2lvbnNcbiAgICAgICAgICAgICAgLy8gb2xkZXIgdGhhbiAxLjEyLjEgY3JlYXRlcyBzeW1ib2xpYyBsaW5rcyB0byBmb2xkZXJzIGluIHRoZSAuYmluIGZvbGRlclxuICAgICAgICAgICAgICAvLyB3aGljaCBsZWFkcyB0byBCYXplbCB0YXJnZXRzIHRoYXQgY3Jvc3MgcGFja2FnZSBib3VuZGFyaWVzLlxuICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy80MjggYW5kXG4gICAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvNDM4LlxuICAgICAgICAgICAgICAvLyBUaGlzIGlzIHRlc3RlZCBpbiAvZTJlL2ZpbmVfZ3JhaW5lZF9zeW1saW5rcy5cbiAgICAgICAgICAgICAgcmV0dXJuIGZpbGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGlzRGlyZWN0b3J5ID8gZmlsZXMuY29uY2F0KGxpc3RGaWxlcyhyb290RGlyLCByZWxQYXRoKSkgOiBmaWxlcy5jb25jYXQocmVsUGF0aCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSlcbiAgICAgIC8vIEZpbGVzIHdpdGggc3BhY2VzIChcXHgyMCkgb3IgdW5pY29kZSBjaGFyYWN0ZXJzICg8XFx4MjAgJiYgPlxceDdFKSBhcmUgbm90IGFsbG93ZWQgaW5cbiAgICAgIC8vIEJhemVsIHJ1bmZpbGVzLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzQzMjdcbiAgICAgIC5maWx0ZXIoZiA9PiAhL1teXFx4MjEtXFx4N0VdLy50ZXN0KGYpKVxuICAgICAgLy8gV2UgcmV0dXJuIGEgc29ydGVkIGFycmF5IHNvIHRoYXQgdGhlIG9yZGVyIG9mIGZpbGVzXG4gICAgICAvLyBpcyB0aGUgc2FtZSByZWdhcmRsZXNzIG9mIHBsYXRmb3JtXG4gICAgICAuc29ydCgpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgbnBtIHBhY2thZ2UgZGlzdHJpYnV0aW9uIGNvbnRhaW5lZCBhXG4gKiByb290IC9CVUlMRCBvciAvQlVJTEQuYmF6ZWwgZmlsZS5cbiAqL1xuZnVuY3Rpb24gaGFzUm9vdEJ1aWxkRmlsZShwa2c6IERlcCwgcm9vdFBhdGg6IHN0cmluZykge1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgcGtnLl9maWxlcykge1xuICAgIC8vIEJhemVsIGZpbGVzIHdvdWxkIGhhdmUgYmVlbiByZW5hbWVkIGVhcmxpZXIgd2l0aCBhIGBfYCBwcmVmaXhcbiAgICBjb25zdCBmaWxlVWMgPSBwYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChmaWxlVWMgPT09ICdfQlVJTEQnIHx8IGZpbGVVYyA9PT0gJ19CVUlMRC5CQVpFTCcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gYWRkRHluYW1pY0RlcGVuZGVuY2llcyhwa2dzOiBEZXBbXSwgZHluYW1pY19kZXBzID0gRFlOQU1JQ19ERVBTKSB7XG4gIGZ1bmN0aW9uIG1hdGNoKG5hbWU6IHN0cmluZywgcDogRGVwKSB7XG4gICAgLy8gQXV0b21hdGljYWxseSBpbmNsdWRlIGR5bmFtaWMgZGVwZW5kZW5jeSBvbiBwbHVnaW5zIG9mIHRoZSBmb3JtIHBrZy1wbHVnaW4tZm9vXG4gICAgaWYgKG5hbWUuc3RhcnRzV2l0aChgJHtwLl9tb2R1bGVOYW1lfS1wbHVnaW4tYCkpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3QgdmFsdWUgPSBkeW5hbWljX2RlcHNbcC5fbW9kdWxlTmFtZV07XG4gICAgaWYgKG5hbWUgPT09IHZhbHVlKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIFN1cHBvcnQgd2lsZGNhcmQgbWF0Y2hcbiAgICBpZiAodmFsdWUgJiYgdmFsdWUuaW5jbHVkZXMoJyonKSAmJiBuYW1lLnN0YXJ0c1dpdGgodmFsdWUuc3Vic3RyaW5nKDAsIHZhbHVlLmluZGV4T2YoJyonKSkpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcGtncy5mb3JFYWNoKHAgPT4ge1xuICAgIHAuX2R5bmFtaWNEZXBlbmRlbmNpZXMgPSBwa2dzLmZpbHRlcih4ID0+ICEheC5fbW9kdWxlTmFtZSAmJiBtYXRjaCh4Ll9tb2R1bGVOYW1lLCBwKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZHluID0+IGAvLyR7ZHluLl9kaXJ9OiR7ZHluLl9uYW1lfWApO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaW5kcyBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBhbGwgcGFja2FnZXMgdW5kZXIgYSBnaXZlbiBwYXRoLlxuICovXG5mdW5jdGlvbiBmaW5kUGFja2FnZXMocCA9ICdub2RlX21vZHVsZXMnKSB7XG4gIGlmICghaXNEaXJlY3RvcnkocCkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBwa2dzOiBEZXBbXSA9IFtdO1xuXG4gIGNvbnN0IGxpc3RpbmcgPSBmcy5yZWFkZGlyU3luYyhwKTtcblxuICBjb25zdCBwYWNrYWdlcyA9IGxpc3RpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBzY29wZXNcbiAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmID0+ICFmLnN0YXJ0c1dpdGgoJ0AnKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBmb2xkZXJzIHN1Y2ggYXMgYC5iaW5gIHdoaWNoIGNhbiBjcmVhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gaXNzdWVzIG9uIFdpbmRvd3Mgc2luY2UgdGhlc2UgYXJlIFwiaGlkZGVuXCIgYnkgZGVmYXVsdFxuICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gIWYuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAgICAgICAgICAgICAgICAubWFwKGYgPT4gcGF0aC5wb3NpeC5qb2luKHAsIGYpKVxuICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gaXNEaXJlY3RvcnkoZikpO1xuXG4gIHBhY2thZ2VzLmZvckVhY2goXG4gICAgICBmID0+IHBrZ3MucHVzaChwYXJzZVBhY2thZ2UoZiksIC4uLmZpbmRQYWNrYWdlcyhwYXRoLnBvc2l4LmpvaW4oZiwgJ25vZGVfbW9kdWxlcycpKSkpO1xuXG4gIGNvbnN0IHNjb3BlcyA9IGxpc3RpbmcuZmlsdGVyKGYgPT4gZi5zdGFydHNXaXRoKCdAJykpXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGYgPT4gcGF0aC5wb3NpeC5qb2luKHAsIGYpKVxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmID0+IGlzRGlyZWN0b3J5KGYpKTtcbiAgc2NvcGVzLmZvckVhY2goZiA9PiBwa2dzLnB1c2goLi4uZmluZFBhY2thZ2VzKGYpKSk7XG5cbiAgYWRkRHluYW1pY0RlcGVuZGVuY2llcyhwa2dzKTtcblxuICByZXR1cm4gcGtncztcbn1cblxuLyoqXG4gKiBGaW5kcyBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBhbGwgcGFja2FnZSBzY29wZXMgaW4gbm9kZV9tb2R1bGVzLlxuICovXG5mdW5jdGlvbiBmaW5kU2NvcGVzKCkge1xuICBjb25zdCBwID0gJ25vZGVfbW9kdWxlcyc7XG4gIGlmICghaXNEaXJlY3RvcnkocCkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBsaXN0aW5nID0gZnMucmVhZGRpclN5bmMocCk7XG5cbiAgY29uc3Qgc2NvcGVzID0gbGlzdGluZy5maWx0ZXIoZiA9PiBmLnN0YXJ0c1dpdGgoJ0AnKSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBwYXRoLnBvc2l4LmpvaW4ocCwgZikpXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gaXNEaXJlY3RvcnkoZikpXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGYgPT4gZi5yZXBsYWNlKC9ebm9kZV9tb2R1bGVzXFwvLywgJycpKTtcblxuICByZXR1cm4gc2NvcGVzO1xufVxuXG4vKipcbiAqIEdpdmVuIHRoZSBuYW1lIG9mIGEgdG9wLWxldmVsIGZvbGRlciBpbiBub2RlX21vZHVsZXMsIHBhcnNlIHRoZVxuICogcGFja2FnZSBqc29uIGFuZCByZXR1cm4gaXQgYXMgYW4gb2JqZWN0IGFsb25nIHdpdGhcbiAqIHNvbWUgYWRkaXRpb25hbCBpbnRlcm5hbCBhdHRyaWJ1dGVzIHByZWZpeGVkIHdpdGggJ18nLlxuICovXG5mdW5jdGlvbiBwYXJzZVBhY2thZ2UocDogc3RyaW5nKTogRGVwIHtcbiAgLy8gUGFyc2UgdGhlIHBhY2thZ2UuanNvbiBmaWxlIG9mIHRoaXMgcGFja2FnZVxuICBjb25zdCBwYWNrYWdlSnNvbiA9IHBhdGgucG9zaXguam9pbihwLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBrZyA9IGlzRmlsZShwYWNrYWdlSnNvbikgPyBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwge2VuY29kaW5nOiAndXRmOCd9KSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3ZlcnNpb246ICcwLjAuMCd9O1xuXG4gIC8vIFRyaW0gdGhlIGxlYWRpbmcgbm9kZV9tb2R1bGVzIGZyb20gdGhlIHBhdGggYW5kXG4gIC8vIGFzc2lnbiB0byBfZGlyIGZvciBmdXR1cmUgdXNlXG4gIHBrZy5fZGlyID0gcC5yZXBsYWNlKC9ebm9kZV9tb2R1bGVzXFwvLywgJycpO1xuXG4gIC8vIFN0YXNoIHRoZSBwYWNrYWdlIGRpcmVjdG9yeSBuYW1lIGZvciBmdXR1cmUgdXNlXG4gIHBrZy5fbmFtZSA9IHBrZy5fZGlyLnNwbGl0KCcvJykucG9wKCk7XG5cbiAgLy8gTW9kdWxlIG5hbWUgb2YgdGhlIHBhY2thZ2UuIFVubGlrZSBcIl9uYW1lXCIgdGhpcyByZXByZXNlbnRzIHRoZVxuICAvLyBmdWxsIHBhY2thZ2UgbmFtZSAoaW5jbHVkaW5nIHNjb3BlIG5hbWUpLlxuICBwa2cuX21vZHVsZU5hbWUgPSBwa2cubmFtZSB8fCBgJHtwa2cuX2Rpcn0vJHtwa2cuX25hbWV9YDtcblxuICAvLyBLZWVwIHRyYWNrIG9mIHdoZXRoZXIgb3Igbm90IHRoaXMgaXMgYSBuZXN0ZWQgcGFja2FnZVxuICBwa2cuX2lzTmVzdGVkID0gL1xcL25vZGVfbW9kdWxlc1xcLy8udGVzdChwKTtcblxuICAvLyBMaXN0IGFsbCB0aGUgZmlsZXMgaW4gdGhlIG5wbSBwYWNrYWdlIGZvciBsYXRlciB1c2VcbiAgcGtnLl9maWxlcyA9IGxpc3RGaWxlcyhwKTtcblxuICAvLyBJbml0aWFsaXplIF9kZXBlbmRlbmNpZXMgdG8gYW4gZW1wdHkgYXJyYXlcbiAgLy8gd2hpY2ggaXMgbGF0ZXIgZmlsbGVkIHdpdGggdGhlIGZsYXR0ZW5lZCBkZXBlbmRlbmN5IGxpc3RcbiAgcGtnLl9kZXBlbmRlbmNpZXMgPSBbXTtcblxuICAvLyBIaWRlIGJhemVsIGZpbGVzIGluIHRoaXMgcGFja2FnZS4gV2UgZG8gdGhpcyBiZWZvcmUgcGFyc2luZ1xuICAvLyB0aGUgbmV4dCBwYWNrYWdlIHRvIHByZXZlbnQgaXNzdWVzIGNhdXNlZCBieSBzeW1saW5rcyBiZXR3ZWVuXG4gIC8vIHBhY2thZ2UgYW5kIG5lc3RlZCBwYWNrYWdlcyBzZXR1cCBieSB0aGUgcGFja2FnZSBtYW5hZ2VyLlxuICBoaWRlQmF6ZWxGaWxlcyhwa2cpO1xuXG4gIHJldHVybiBwa2c7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBiaW4gZW50cnkgaXMgYSBub24tZW1wdHkgcGF0aFxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQmluUGF0aChlbnRyeTogYW55KSB7XG4gIHJldHVybiBpc1ZhbGlkQmluUGF0aFN0cmluZ1ZhbHVlKGVudHJ5KSB8fCBpc1ZhbGlkQmluUGF0aE9iamVjdFZhbHVlcyhlbnRyeSk7XG59XG5cbi8qKlxuICogSWYgZ2l2ZW4gYSBzdHJpbmcsIGNoZWNrIGlmIGEgYmluIGVudHJ5IGlzIGEgbm9uLWVtcHR5IHBhdGhcbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEJpblBhdGhTdHJpbmdWYWx1ZShlbnRyeTogYW55KSB7XG4gIHJldHVybiB0eXBlb2YgZW50cnkgPT09ICdzdHJpbmcnICYmIGVudHJ5ICE9PSAnJztcbn1cblxuLyoqXG4gKiBJZiBnaXZlbiBhbiBvYmplY3QgbGl0ZXJhbCwgY2hlY2sgaWYgYSBiaW4gZW50cnkgb2JqZWN0cyBoYXMgYXQgbGVhc3Qgb25lIGEgbm9uLWVtcHR5IHBhdGhcbiAqIEV4YW1wbGUgMTogeyBlbnRyeTogJy4vcGF0aC90by9zY3JpcHQuanMnIH0gPT0+IFZBTElEXG4gKiBFeGFtcGxlIDI6IHsgZW50cnk6ICcnIH0gPT0+IElOVkFMSURcbiAqIEV4YW1wbGUgMzogeyBlbnRyeTogJy4vcGF0aC90by9zY3JpcHQuanMnLCBlbXB0eTogJycgfSA9PT4gVkFMSURcbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEJpblBhdGhPYmplY3RWYWx1ZXMoZW50cnk6IEJhZzxzdHJpbmc+KTogYm9vbGVhbiB7XG4gIC8vIFdlIGFsbG93IGF0IGxlYXN0IG9uZSB2YWxpZCBlbnRyeSBwYXRoIChpZiBhbnkpLlxuICByZXR1cm4gZW50cnkgJiYgdHlwZW9mIGVudHJ5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgT2JqZWN0Wyd2YWx1ZXMnXShlbnRyeSkuZmlsdGVyKF9lbnRyeSA9PiBpc1ZhbGlkQmluUGF0aChfZW50cnkpKS5sZW5ndGggPiAwO1xufVxuXG4vKipcbiAqIENsZWFudXAgYSBwYWNrYWdlLmpzb24gXCJiaW5cIiBwYXRoLlxuICpcbiAqIEJpbiBwYXRocyB1c3VhbGx5IGNvbWUgaW4gMiBmbGF2b3JzOiAnLi9iaW4vZm9vJyBvciAnYmluL2ZvbycsXG4gKiBzb21ldGltZXMgb3RoZXIgc3R1ZmYgbGlrZSAnbGliL2ZvbycuICBSZW1vdmUgcHJlZml4ICcuLycgaWYgaXRcbiAqIGV4aXN0cy5cbiAqL1xuZnVuY3Rpb24gY2xlYW51cEJpblBhdGgocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuaW5kZXhPZignLi8nKSA9PT0gMCkge1xuICAgIHAgPSBwLnNsaWNlKDIpO1xuICB9XG4gIHJldHVybiBwO1xufVxuXG4vKipcbiAqIENsZWFudXAgYSBwYWNrYWdlLmpzb24gZW50cnkgcG9pbnQgc3VjaCBhcyBcIm1haW5cIlxuICpcbiAqIFJlbW92ZXMgJy4vJyBpZiBpdCBleGlzdHMuXG4gKiBBcHBlbmRzIGBpbmRleC5qc2AgaWYgcCBlbmRzIHdpdGggYC9gLlxuICovXG5mdW5jdGlvbiBjbGVhbnVwRW50cnlQb2ludFBhdGgocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuaW5kZXhPZignLi8nKSA9PT0gMCkge1xuICAgIHAgPSBwLnNsaWNlKDIpO1xuICB9XG4gIGlmIChwLmVuZHNXaXRoKCcvJykpIHtcbiAgICBwICs9ICdpbmRleC5qcyc7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG5cbi8qKlxuICogQ2xlYW5zIHVwIHRoZSBnaXZlbiBwYXRoXG4gKiBUaGVuIHRyaWVzIHRvIHJlc29sdmUgdGhlIHBhdGggaW50byBhIGZpbGUgYW5kIHdhcm5zIGlmIFZFUkJPU0VfTE9HUyBzZXQgYW5kIHRoZSBmaWxlIGRvc2VuJ3RcbiAqIGV4aXN0XG4gKiBAcGFyYW0ge2FueX0gcGtnXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHJldHVybnMge3N0cmluZyB8IHVuZGVmaW5lZH1cbiAqL1xuZnVuY3Rpb24gZmluZEVudHJ5RmlsZShwa2c6IERlcCwgcGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IGNsZWFuUGF0aCA9IGNsZWFudXBFbnRyeVBvaW50UGF0aChwYXRoKTtcbiAgLy8gY2hlY2sgaWYgbWFpbiBlbnRyeSBwb2ludCBleGlzdHNcbiAgY29uc3QgZW50cnlGaWxlID0gZmluZEZpbGUocGtnLCBjbGVhblBhdGgpIHx8IGZpbmRGaWxlKHBrZywgYCR7Y2xlYW5QYXRofS5qc2ApO1xuICBpZiAoIWVudHJ5RmlsZSkge1xuICAgIC8vIElmIGVudHJ5UG9pbnQgZW50cnkgcG9pbnQgbGlzdGVkIGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhIGZpbGVcbiAgICAvLyBUaGlzIGNhbiBoYXBwZW5cbiAgICAvLyBpbiBzb21lIG5wbSBwYWNrYWdlcyB0aGF0IGxpc3QgYW4gaW5jb3JyZWN0IG1haW4gc3VjaCBhcyB2OC1jb3ZlcmFnZUAxLjAuOFxuICAgIC8vIHdoaWNoIGxpc3RzIGBcIm1haW5cIjogXCJpbmRleC5qc1wiYCBidXQgdGhhdCBmaWxlIGRvZXMgbm90IGV4aXN0LlxuICAgIGxvZ192ZXJib3NlKFxuICAgICAgICBgY291bGQgbm90IGZpbmQgZW50cnkgcG9pbnQgZm9yIHRoZSBwYXRoICR7Y2xlYW5QYXRofSBnaXZlbiBieSBucG0gcGFja2FnZSAke3BrZy5fbmFtZX1gKTtcbiAgfVxuICByZXR1cm4gZW50cnlGaWxlO1xufVxuXG4vKipcbiAqIFRyaWVzIHRvIHJlc29sdmUgdGhlIGVudHJ5UG9pbnQgZmlsZSBmcm9tIHRoZSBwa2cgZm9yIGEgZ2l2ZW4gbWFpbkZpbGVOYW1lXG4gKlxuICogQHBhcmFtIHthbnl9IHBrZ1xuICogQHBhcmFtIHsnYnJvd3NlcicgfCAnbW9kdWxlJyB8ICdtYWluJ30gbWFpbkZpbGVOYW1lXG4gKiBAcmV0dXJucyB7c3RyaW5nIHwgdW5kZWZpbmVkfSB0aGUgcGF0aCBvciB1bmRlZmluZWQgaWYgd2UgY2FudCByZXNvbHZlIHRoZSBmaWxlXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVNYWluRmlsZShwa2c6IERlcCwgbWFpbkZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgbWFpbkVudHJ5RmllbGQgPSBwa2dbbWFpbkZpbGVOYW1lXTtcblxuICBpZiAobWFpbkVudHJ5RmllbGQpIHtcbiAgICBpZiAodHlwZW9mIG1haW5FbnRyeUZpZWxkID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGZpbmRFbnRyeUZpbGUocGtnLCBtYWluRW50cnlGaWVsZClcblxuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1haW5FbnRyeUZpZWxkID09PSAnb2JqZWN0JyAmJiBtYWluRmlsZU5hbWUgPT09ICdicm93c2VyJykge1xuICAgICAgLy8gYnJvd3NlciBoYXMgYSB3ZWlyZCB3YXkgb2YgZGVmaW5pbmcgdGhpc1xuICAgICAgLy8gdGhlIGJyb3dzZXIgdmFsdWUgaXMgYW4gb2JqZWN0IGxpc3RpbmcgZmlsZXMgdG8gYWxpYXMsIHVzdWFsbHkgcG9pbnRpbmcgdG8gYSBicm93c2VyIGRpclxuICAgICAgY29uc3QgaW5kZXhFbnRyeVBvaW50ID0gbWFpbkVudHJ5RmllbGRbJ2luZGV4LmpzJ10gfHwgbWFpbkVudHJ5RmllbGRbJy4vaW5kZXguanMnXTtcbiAgICAgIGlmIChpbmRleEVudHJ5UG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRFbnRyeUZpbGUocGtnLCBpbmRleEVudHJ5UG9pbnQpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVHJpZXMgdG8gcmVzb2x2ZSB0aGUgbWFpbkZpbGUgZnJvbSBhIGdpdmVuIHBrZ1xuICogVGhpcyB1c2VzIHNldmVhbCBtYWluRmlsZU5hbWVzIGluIHByaW9yaXR5IHRvIGZpbmQgYSBjb3JyZWN0IHVzYWJsZSBmaWxlXG4gKiBAcGFyYW0ge2FueX0gcGtnXG4gKiBAcmV0dXJucyB7c3RyaW5nIHwgdW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiByZXNvbHZlUGtnTWFpbkZpbGUocGtnOiBEZXApIHtcbiAgLy8gZXMyMDE1IGlzIGFub3RoZXIgb3B0aW9uIGZvciBtYWluRmlsZSBoZXJlXG4gIC8vIGJ1dCBpdHMgdmVyeSB1bmNvbW1vbiBhbmQgaW0gbm90IHN1cmUgd2hhdCBwcmlvcml0eSBpdCB0YWtlc1xuICAvL1xuICAvLyB0aGlzIGxpc3QgaXMgb3JkZXJlZCwgd2UgdHJ5IHJlc29sdmUgYGJyb3dzZXJgIGZpcnN0LCB0aGVuIGBtb2R1bGVgIGFuZCBmaW5hbGx5IGZhbGwgYmFjayB0b1xuICAvLyBgbWFpbmBcbiAgY29uc3QgbWFpbkZpbGVOYW1lcyA9IFsnYnJvd3NlcicsICdtb2R1bGUnLCAnbWFpbiddXG5cbiAgICAgIGZvciAoY29uc3QgbWFpbkZpbGUgb2YgbWFpbkZpbGVOYW1lcykge1xuICAgIGNvbnN0IHJlc29sdmVkTWFpbkZpbGUgPSByZXNvbHZlTWFpbkZpbGUocGtnLCBtYWluRmlsZSk7XG4gICAgaWYgKHJlc29sdmVkTWFpbkZpbGUpIHtcbiAgICAgIHJldHVybiByZXNvbHZlZE1haW5GaWxlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHdlIGNhbnQgZmluZCBhbnkgY29ycmVjdCBmaWxlIHJlZmVyZW5jZXMgZnJvbSB0aGUgcGtnXG4gIC8vIHRoZW4gd2UganVzdCB0cnkgbG9va2luZyBhcm91bmQgZm9yIGNvbW1vbiBwYXR0ZXJuc1xuICBjb25zdCBtYXliZVJvb3RJbmRleCA9IGZpbmRFbnRyeUZpbGUocGtnLCAnaW5kZXguanMnKTtcbiAgaWYgKG1heWJlUm9vdEluZGV4KSB7XG4gICAgcmV0dXJuIG1heWJlUm9vdEluZGV4XG4gIH1cblxuICBjb25zdCBtYXliZVNlbGZOYW1lZEluZGV4ID0gZmluZEVudHJ5RmlsZShwa2csIGAke3BrZy5fbmFtZX0uanNgKTtcbiAgaWYgKG1heWJlU2VsZk5hbWVkSW5kZXgpIHtcbiAgICByZXR1cm4gbWF5YmVTZWxmTmFtZWRJbmRleDtcbiAgfVxuXG4gIC8vIG5vbmUgb2YgdGhlIG1ldGhvZHMgd2UgdHJpZWQgcmVzdWx0ZWQgaW4gYSBmaWxlXG4gIGxvZ192ZXJib3NlKGBjb3VsZCBub3QgZmluZCBlbnRyeSBwb2ludCBmb3IgbnBtIHBhY2thZ2UgJHtwa2cuX25hbWV9YCk7XG5cbiAgLy8gYXQgdGhpcyBwb2ludCB0aGVyZSdzIG5vdGhpbmcgbGVmdCBmb3IgdXMgdG8gdHJ5LCBzbyByZXR1cm4gbm90aGluZ1xuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG50eXBlIEJhZzxUPiA9XG4gICAge1xuICAgICAgW2s6IHN0cmluZ106IFRcbiAgICB9XG5cbi8qKlxuICogRmxhdHRlbnMgYWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIG9mIGEgcGFja2FnZVxuICogaW50byBhIF9kZXBlbmRlbmNpZXMgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5Qa2dEZXBlbmRlbmNpZXMocGtnOiBEZXAsIGRlcDogRGVwLCBwa2dzTWFwOiBNYXA8c3RyaW5nLCBEZXA+KSB7XG4gIGlmIChwa2cuX2RlcGVuZGVuY2llcy5pbmRleE9mKGRlcCkgIT09IC0xKSB7XG4gICAgLy8gY2lyY3VsYXIgZGVwZW5kZW5jeVxuICAgIHJldHVybjtcbiAgfVxuICBwa2cuX2RlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gIGNvbnN0IGZpbmREZXBzID0gZnVuY3Rpb24odGFyZ2V0RGVwczogQmFnPHN0cmluZz4sIHJlcXVpcmVkOiBib29sZWFuLCBkZXBUeXBlOiBzdHJpbmcpIHtcbiAgICBPYmplY3Qua2V5cyh0YXJnZXREZXBzIHx8IHt9KVxuICAgICAgICAubWFwKHRhcmdldERlcCA9PiB7XG4gICAgICAgICAgLy8gbG9vayBmb3IgbWF0Y2hpbmcgbmVzdGVkIHBhY2thZ2VcbiAgICAgICAgICBjb25zdCBkaXJTZWdtZW50cyA9IGRlcC5fZGlyLnNwbGl0KCcvJyk7XG4gICAgICAgICAgd2hpbGUgKGRpclNlZ21lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgbWF5YmUgPSBwYXRoLnBvc2l4LmpvaW4oLi4uZGlyU2VnbWVudHMsICdub2RlX21vZHVsZXMnLCB0YXJnZXREZXApO1xuICAgICAgICAgICAgaWYgKHBrZ3NNYXAuaGFzKG1heWJlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gcGtnc01hcC5nZXQobWF5YmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlyU2VnbWVudHMucG9wKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGxvb2sgZm9yIG1hdGNoaW5nIHJvb3QgcGFja2FnZVxuICAgICAgICAgIGlmIChwa2dzTWFwLmhhcyh0YXJnZXREZXApKSB7XG4gICAgICAgICAgICByZXR1cm4gcGtnc01hcC5nZXQodGFyZ2V0RGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZGVwZW5kZW5jeSBub3QgZm91bmRcbiAgICAgICAgICBpZiAocmVxdWlyZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYGNvdWxkIG5vdCBmaW5kICR7ZGVwVHlwZX0gJyR7dGFyZ2V0RGVwfScgb2YgJyR7ZGVwLl9kaXJ9J2ApO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSlcbiAgICAgICAgLmZpbHRlcihkZXAgPT4gISFkZXApXG4gICAgICAgIC5mb3JFYWNoKGRlcCA9PiBmbGF0dGVuUGtnRGVwZW5kZW5jaWVzKHBrZywgZGVwISwgcGtnc01hcCkpO1xuICB9O1xuICAvLyBucG0gd2lsbCBpbiBzb21lIGNhc2VzIGFkZCBvcHRpb25hbERlcGVuZGVuY2llcyB0byB0aGUgbGlzdFxuICAvLyBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIHBhY2thZ2UuanNvbiBpdCB3cml0ZXMgdG8gbm9kZV9tb2R1bGVzLlxuICAvLyBXZSBkZWxldGUgdGhlc2UgaGVyZSBpZiB0aGV5IGV4aXN0IGFzIHRoZXkgbWF5IHJlc3VsdFxuICAvLyBpbiBleHBlY3RlZCBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbm90IGZvdW5kLlxuICBpZiAoZGVwLmRlcGVuZGVuY2llcyAmJiBkZXAub3B0aW9uYWxEZXBlbmRlbmNpZXMpIHtcbiAgICBPYmplY3Qua2V5cyhkZXAub3B0aW9uYWxEZXBlbmRlbmNpZXMpLmZvckVhY2gob3B0aW9uYWxEZXAgPT4ge1xuICAgICAgZGVsZXRlIGRlcC5kZXBlbmRlbmNpZXNbb3B0aW9uYWxEZXBdO1xuICAgIH0pO1xuICB9XG5cbiAgZmluZERlcHMoZGVwLmRlcGVuZGVuY2llcywgdHJ1ZSwgJ2RlcGVuZGVuY3knKTtcbiAgZmluZERlcHMoZGVwLnBlZXJEZXBlbmRlbmNpZXMsIHRydWUsICdwZWVyIGRlcGVuZGVuY3knKTtcbiAgLy8gYG9wdGlvbmFsRGVwZW5kZW5jaWVzYCB0aGF0IGFyZSBtaXNzaW5nIHNob3VsZCBiZSBzaWxlbnRseVxuICAvLyBpZ25vcmVkIHNpbmNlIHRoZSBucG0veWFybiB3aWxsIG5vdCBmYWlsIGlmIHRoZXNlIGRlcGVuZGVuY2llc1xuICAvLyBmYWlsIHRvIGluc3RhbGwuIFBhY2thZ2VzIHNob3VsZCBoYW5kbGUgdGhlIGNhc2VzIHdoZXJlIHRoZXNlXG4gIC8vIGRlcGVuZGVuY2llcyBhcmUgbWlzc2luZyBncmFjZWZ1bGx5IGF0IHJ1bnRpbWUuXG4gIC8vIEFuIGV4YW1wbGUgb2YgdGhpcyBpcyB0aGUgYGNob2tpZGFyYCBwYWNrYWdlIHdoaWNoIHNwZWNpZmllc1xuICAvLyBgZnNldmVudHNgIGFzIGFuIG9wdGlvbmFsRGVwZW5kZW5jeS4gT24gT1NYLCBgZnNldmVudHNgXG4gIC8vIGlzIGluc3RhbGxlZCBzdWNjZXNzZnVsbHksIGJ1dCBvbiBXaW5kb3dzICYgTGludXgsIGBmc2V2ZW50c2BcbiAgLy8gZmFpbHMgdG8gaW5zdGFsbCBhbmQgdGhlIHBhY2thZ2Ugd2lsbCBub3QgYmUgcHJlc2VudCB3aGVuXG4gIC8vIGNoZWNraW5nIHRoZSBkZXBlbmRlbmNpZXMgb2YgYGNob2tpZGFyYC5cbiAgZmluZERlcHMoZGVwLm9wdGlvbmFsRGVwZW5kZW5jaWVzLCBmYWxzZSwgJ29wdGlvbmFsIGRlcGVuZGVuY3knKTtcbn1cblxuLyoqXG4gKiBSZWZvcm1hdC9wcmV0dHktcHJpbnQgYSBqc29uIG9iamVjdCBhcyBhIHNreWxhcmsgY29tbWVudCAoZWFjaCBsaW5lXG4gKiBzdGFydHMgd2l0aCAnIyAnKS5cbiAqL1xuZnVuY3Rpb24gcHJpbnRKc29uKHBrZzogRGVwKSB7XG4gIC8vIENsb25lIGFuZCBtb2RpZnkgX2RlcGVuZGVuY2llcyB0byBhdm9pZCBjaXJjdWxhciBpc3N1ZXMgd2hlbiBKU09OaWZ5aW5nXG4gIC8vICYgZGVsZXRlIF9maWxlcyBhcnJheVxuICBjb25zdCBjbG9uZWQ6IGFueSA9IHsuLi5wa2d9O1xuICBjbG9uZWQuX2RlcGVuZGVuY2llcyA9IHBrZy5fZGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gZGVwLl9kaXIpO1xuICBkZWxldGUgY2xvbmVkLl9maWxlcztcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGNsb25lZCwgbnVsbCwgMikuc3BsaXQoJ1xcbicpLm1hcChsaW5lID0+IGAjICR7bGluZX1gKS5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBBIGZpbHRlciBmdW5jdGlvbiBmb3IgZmlsZXMgaW4gYW4gbnBtIHBhY2thZ2UuIENvbXBhcmlzb24gaXMgY2FzZS1pbnNlbnNpdGl2ZS5cbiAqIEBwYXJhbSBmaWxlcyBhcnJheSBvZiBmaWxlcyB0byBmaWx0ZXJcbiAqIEBwYXJhbSBleHRzIGxpc3Qgb2Ygd2hpdGUgbGlzdGVkIGNhc2UtaW5zZW5zaXRpdmUgZXh0ZW5zaW9uczsgaWYgZW1wdHksIG5vIGZpbHRlciBpc1xuICogICAgICAgICAgICAgZG9uZSBvbiBleHRlbnNpb25zOyAnJyBlbXB0eSBzdHJpbmcgZGVub3RlcyB0byBhbGxvdyBmaWxlcyB3aXRoIG5vIGV4dGVuc2lvbnMsXG4gKiAgICAgICAgICAgICBvdGhlciBleHRlbnNpb25zIGFyZSBsaXN0ZWQgd2l0aCAnLmV4dCcgbm90YXRpb24gc3VjaCBhcyAnLmQudHMnLlxuICovXG5mdW5jdGlvbiBmaWx0ZXJGaWxlcyhmaWxlczogc3RyaW5nW10sIGV4dHM6IHN0cmluZ1tdID0gW10pIHtcbiAgaWYgKGV4dHMubGVuZ3RoKSB7XG4gICAgY29uc3QgYWxsb3dOb0V4dHMgPSBleHRzLmluY2x1ZGVzKCcnKTtcbiAgICBmaWxlcyA9IGZpbGVzLmZpbHRlcihmID0+IHtcbiAgICAgIC8vIGluY2x1ZGUgZmlsZXMgd2l0aCBubyBleHRlbnNpb25zIGlmIG5vRXh0IGlzIHRydWVcbiAgICAgIGlmIChhbGxvd05vRXh0cyAmJiAhcGF0aC5leHRuYW1lKGYpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIC8vIGZpbHRlciBmaWxlcyBpbiBleHRzXG4gICAgICBjb25zdCBsYyA9IGYudG9Mb3dlckNhc2UoKTtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBleHRzKSB7XG4gICAgICAgIGlmIChlICYmIGxjLmVuZHNXaXRoKGUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pXG4gIH1cbiAgLy8gRmlsdGVyIG91dCBCVUlMRCBmaWxlcyB0aGF0IGNhbWUgd2l0aCB0aGUgbnBtIHBhY2thZ2VcbiAgcmV0dXJuIGZpbGVzLmZpbHRlcihmaWxlID0+IHtcbiAgICBjb25zdCBiYXNlbmFtZVVjID0gcGF0aC5iYXNlbmFtZShmaWxlKS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChiYXNlbmFtZVVjID09PSAnX0JVSUxEJyB8fCBiYXNlbmFtZVVjID09PSAnX0JVSUxELkJBWkVMJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBzcGVjaWZpZWQgYHBrZ2AgY29uZm9ybXMgdG8gQW5ndWxhciBQYWNrYWdlIEZvcm1hdCAoQVBGKSxcbiAqIGZhbHNlIG90aGVyd2lzZS4gSWYgdGhlIHBhY2thZ2UgY29udGFpbnMgYCoubWV0YWRhdGEuanNvbmAgYW5kIGFcbiAqIGNvcnJlc3BvbmRpbmcgc2libGluZyBgLmQudHNgIGZpbGUsIHRoZW4gdGhlIHBhY2thZ2UgaXMgY29uc2lkZXJlZCB0byBiZSBBUEYuXG4gKi9cbmZ1bmN0aW9uIGlzTmdBcGZQYWNrYWdlKHBrZzogRGVwKSB7XG4gIGNvbnN0IHNldCA9IG5ldyBTZXQocGtnLl9maWxlcyk7XG4gIGlmIChzZXQuaGFzKCdBTkdVTEFSX1BBQ0tBR0UnKSkge1xuICAgIC8vIFRoaXMgZmlsZSBpcyB1c2VkIGJ5IHRoZSBucG0veWFybl9pbnN0YWxsIHJ1bGUgdG8gZGV0ZWN0IEFQRi4gU2VlXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy85MjdcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBjb25zdCBtZXRhZGF0YUV4dCA9IC9cXC5tZXRhZGF0YVxcLmpzb24kLztcbiAgcmV0dXJuIHBrZy5fZmlsZXMuc29tZSgoZmlsZSkgPT4ge1xuICAgIGlmIChtZXRhZGF0YUV4dC50ZXN0KGZpbGUpKSB7XG4gICAgICBjb25zdCBzaWJsaW5nID0gZmlsZS5yZXBsYWNlKG1ldGFkYXRhRXh0LCAnLmQudHMnKTtcbiAgICAgIGlmIChzZXQuaGFzKHNpYmxpbmcpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufVxuXG4vKipcbiAqIElmIHRoZSBwYWNrYWdlIGlzIGluIHRoZSBBbmd1bGFyIHBhY2thZ2UgZm9ybWF0IHJldHVybnMgbGlzdFxuICogb2YgcGFja2FnZSBmaWxlcyB0aGF0IGVuZCB3aXRoIGAudW1kLmpzYCwgYC5uZ2ZhY3RvcnkuanNgIGFuZCBgLm5nc3VtbWFyeS5qc2AuXG4gKi9cbmZ1bmN0aW9uIGdldE5nQXBmU2NyaXB0cyhwa2c6IERlcCkge1xuICByZXR1cm4gaXNOZ0FwZlBhY2thZ2UocGtnKSA/XG4gICAgICBmaWx0ZXJGaWxlcyhwa2cuX2ZpbGVzLCBbJy51bWQuanMnLCAnLm5nZmFjdG9yeS5qcycsICcubmdzdW1tYXJ5LmpzJ10pIDpcbiAgICAgIFtdO1xufVxuXG4vKipcbiAqIExvb2tzIGZvciBhIGZpbGUgd2l0aGluIGEgcGFja2FnZSBhbmQgcmV0dXJucyBpdCBpZiBmb3VuZC5cbiAqL1xuZnVuY3Rpb24gZmluZEZpbGUocGtnOiBEZXAsIG06IHN0cmluZykge1xuICBjb25zdCBtbCA9IG0udG9Mb3dlckNhc2UoKTtcbiAgZm9yIChjb25zdCBmIG9mIHBrZy5fZmlsZXMpIHtcbiAgICBpZiAoZi50b0xvd2VyQ2FzZSgpID09PSBtbCkge1xuICAgICAgcmV0dXJuIGY7XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBwa2csIHJldHVybiB0aGUgc2t5bGFyayBgbm9kZV9tb2R1bGVfbGlicmFyeWAgdGFyZ2V0cyBmb3IgdGhlIHBhY2thZ2UuXG4gKi9cbmZ1bmN0aW9uIHByaW50UGFja2FnZShwa2c6IERlcCkge1xuICBjb25zdCBzb3VyY2VzID0gZmlsdGVyRmlsZXMocGtnLl9maWxlcywgSU5DTFVERURfRklMRVMpO1xuICBjb25zdCBkdHNTb3VyY2VzID0gZmlsdGVyRmlsZXMocGtnLl9maWxlcywgWycuZC50cyddKTtcbiAgLy8gVE9ETyhnbWFnb2xhbik6IGFkZCBVTUQgJiBBTUQgc2NyaXB0cyB0byBzY3JpcHRzIGV2ZW4gaWYgbm90IGFuIEFQRiBwYWNrYWdlIF9idXRfIG9ubHkgaWYgdGhleVxuICAvLyBhcmUgbmFtZWQ/XG4gIGNvbnN0IHNjcmlwdHMgPSBnZXROZ0FwZlNjcmlwdHMocGtnKTtcbiAgY29uc3QgZGVwcyA9IFtwa2ddLmNvbmNhdChwa2cuX2RlcGVuZGVuY2llcy5maWx0ZXIoZGVwID0+IGRlcCAhPT0gcGtnICYmICFkZXAuX2lzTmVzdGVkKSk7XG5cbiAgbGV0IHNjcmlwdFN0YXJsYXJrID0gJyc7XG4gIGlmIChzY3JpcHRzLmxlbmd0aCkge1xuICAgIHNjcmlwdFN0YXJsYXJrID0gYFxuICAgICMgc3Vic2V0IG9mIHNyY3MgdGhhdCBhcmUgamF2YXNjcmlwdCBuYW1lZC1VTUQgb3IgbmFtZWQtQU1EIHNjcmlwdHNcbiAgICBzY3JpcHRzID0gW1xuICAgICAgICAke3NjcmlwdHMubWFwKChmOiBzdHJpbmcpID0+IGBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke2Z9XCIsYCkuam9pbignXFxuICAgICAgICAnKX1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgc3Jjc1N0YXJsYXJrID0gJyc7XG4gIGlmIChzb3VyY2VzLmxlbmd0aCkge1xuICAgIHNyY3NTdGFybGFyayA9IGBcbiAgICAjICR7cGtnLl9kaXJ9IHBhY2thZ2UgZmlsZXMgKGFuZCBmaWxlcyBpbiBuZXN0ZWQgbm9kZV9tb2R1bGVzKVxuICAgIHNyY3MgPSBbXG4gICAgICAgICR7c291cmNlcy5tYXAoKGY6IHN0cmluZykgPT4gYFwiLy86bm9kZV9tb2R1bGVzLyR7cGtnLl9kaXJ9LyR7Zn1cIixgKS5qb2luKCdcXG4gICAgICAgICcpfVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBkZXBzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGRlcHMubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IGRlcHMubWFwKGRlcCA9PiBgXCIvLyR7ZGVwLl9kaXJ9OiR7ZGVwLl9uYW1lfV9fY29udGVudHNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIGRlcHNTdGFybGFyayA9IGBcbiAgICAjIGZsYXR0ZW5lZCBsaXN0IG9mIGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgaG9pc3RlZCB0byByb290IGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXJcbiAgICBkZXBzID0gW1xuICAgICAgICAke2xpc3R9XG4gICAgXSxgO1xuICB9XG5cbiAgbGV0IGR0c1N0YXJsYXJrID0gJyc7XG4gIGlmIChkdHNTb3VyY2VzLmxlbmd0aCkge1xuICAgIGR0c1N0YXJsYXJrID0gYFxuICAgICMgJHtwa2cuX2Rpcn0gcGFja2FnZSBkZWNsYXJhdGlvbiBmaWxlcyAoYW5kIGRlY2xhcmF0aW9uIGZpbGVzIGluIG5lc3RlZCBub2RlX21vZHVsZXMpXG4gICAgc3JjcyA9IFtcbiAgICAgICAgJHtkdHNTb3VyY2VzLm1hcChmID0+IGBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke2Z9XCIsYCkuam9pbignXFxuICAgICAgICAnKX1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgcmVzdWx0ID1cbiAgICAgIGBsb2FkKFwiQGJ1aWxkX2JhemVsX3J1bGVzX25vZGVqcy8vaW50ZXJuYWwvbnBtX2luc3RhbGw6bm9kZV9tb2R1bGVfbGlicmFyeS5iemxcIiwgXCJub2RlX21vZHVsZV9saWJyYXJ5XCIpXG5cbiMgR2VuZXJhdGVkIHRhcmdldHMgZm9yIG5wbSBwYWNrYWdlIFwiJHtwa2cuX2Rpcn1cIlxuJHtwcmludEpzb24ocGtnKX1cblxuZmlsZWdyb3VwKFxuICAgIG5hbWUgPSBcIiR7cGtnLl9uYW1lfV9fZmlsZXNcIiwke3NyY3NTdGFybGFya31cbilcblxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1cIixcbiAgICAjIGRpcmVjdCBzb3VyY2VzIGxpc3RlZCBmb3Igc3RyaWN0IGRlcHMgc3VwcG9ydFxuICAgIHNyY3MgPSBbXCI6JHtwa2cuX25hbWV9X19maWxlc1wiXSwke2RlcHNTdGFybGFya31cbilcblxuIyAke3BrZy5fbmFtZX1fX2NvbnRlbnRzIHRhcmdldCBpcyB1c2VkIGFzIGRlcCBmb3IgbWFpbiB0YXJnZXRzIHRvIHByZXZlbnRcbiMgY2lyY3VsYXIgZGVwZW5kZW5jaWVzIGVycm9yc1xubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1fX2NvbnRlbnRzXCIsXG4gICAgc3JjcyA9IFtcIjoke3BrZy5fbmFtZX1fX2ZpbGVzXCJdLCR7c2NyaXB0U3Rhcmxhcmt9XG4pXG5cbiMgJHtwa2cuX25hbWV9X190eXBpbmdzIGlzIHRoZSBzdWJzZXQgb2YgJHtwa2cuX25hbWV9X19jb250ZW50cyB0aGF0IGFyZSBkZWNsYXJhdGlvbnNcbm5vZGVfbW9kdWxlX2xpYnJhcnkoXG4gICAgbmFtZSA9IFwiJHtwa2cuX25hbWV9X190eXBpbmdzXCIsJHtkdHNTdGFybGFya31cbilcblxuYDtcblxuICBsZXQgbWFpbkVudHJ5UG9pbnQgPSByZXNvbHZlUGtnTWFpbkZpbGUocGtnKVxuXG4gIC8vIGFkZCBhbiBgbnBtX3VtZF9idW5kbGVgIHRhcmdldCB0byBnZW5lcmF0ZSBhbiBVTUQgYnVuZGxlIGlmIG9uZSBkb2VzXG4gIC8vIG5vdCBleGlzdHNcbiAgaWYgKG1haW5FbnRyeVBvaW50ICYmICFmaW5kRmlsZShwa2csIGAke3BrZy5fbmFtZX0udW1kLmpzYCkpIHtcbiAgICByZXN1bHQgKz1cbiAgICAgICAgYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy9pbnRlcm5hbC9ucG1faW5zdGFsbDpucG1fdW1kX2J1bmRsZS5iemxcIiwgXCJucG1fdW1kX2J1bmRsZVwiKVxuXG5ucG1fdW1kX2J1bmRsZShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1fX3VtZFwiLFxuICAgIHBhY2thZ2VfbmFtZSA9IFwiJHtwa2cuX25hbWV9XCIsXG4gICAgZW50cnlfcG9pbnQgPSBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke21haW5FbnRyeVBvaW50fVwiLFxuICAgIHBhY2thZ2UgPSBcIjoke3BrZy5fbmFtZX1cIixcbilcblxuYDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIF9maW5kRXhlY3V0YWJsZXMocGtnOiBEZXApIHtcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBuZXcgTWFwKCk7XG5cbiAgLy8gRm9yIHJvb3QgcGFja2FnZXMsIHRyYW5zZm9ybSB0aGUgcGtnLmJpbiBlbnRyaWVzXG4gIC8vIGludG8gYSBuZXcgTWFwIGNhbGxlZCBfZXhlY3V0YWJsZXNcbiAgLy8gTk9URTogd2UgZG8gdGhpcyBvbmx5IGZvciBub24tZW1wdHkgYmluIHBhdGhzXG4gIGlmIChpc1ZhbGlkQmluUGF0aChwa2cuYmluKSkge1xuICAgIGlmICghcGtnLl9pc05lc3RlZCkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGtnLmJpbikpIHtcbiAgICAgICAgaWYgKHBrZy5iaW4ubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBleGVjdXRhYmxlcy5zZXQocGtnLl9kaXIsIGNsZWFudXBCaW5QYXRoKHBrZy5iaW5bMF0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzaG91bGQgbm90IGhhcHBlbiwgYnV0IGlnbm9yZSBpdCBpZiBwcmVzZW50XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBrZy5iaW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGV4ZWN1dGFibGVzLnNldChwa2cuX2RpciwgY2xlYW51cEJpblBhdGgocGtnLmJpbikpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGtnLmJpbiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHBrZy5iaW4pIHtcbiAgICAgICAgICBpZiAoaXNWYWxpZEJpblBhdGhTdHJpbmdWYWx1ZShwa2cuYmluW2tleV0pKSB7XG4gICAgICAgICAgICBleGVjdXRhYmxlcy5zZXQoa2V5LCBjbGVhbnVwQmluUGF0aChwa2cuYmluW2tleV0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZXhlY3V0YWJsZXM7XG59XG5cbi8vIEhhbmRsZSBhZGRpdGlvbmFsQXR0cmlidXRlcyBvZiBmb3JtYXQ6XG4vLyBgYGBcbi8vIFwiYmF6ZWxCaW5cIjoge1xuLy8gICBcIm5nYy13cmFwcGVkXCI6IHtcbi8vICAgICBcImFkZGl0aW9uYWxBdHRyaWJ1dGVzXCI6IHtcbi8vICAgICAgIFwiY29uZmlndXJhdGlvbl9lbnZfdmFyc1wiOiBcIltcXFwiY29tcGlsZVxcXCJdXCJcbi8vICAgfVxuLy8gfSxcbi8vIGBgYFxuZnVuY3Rpb24gYWRkaXRpb25hbEF0dHJpYnV0ZXMocGtnOiBEZXAsIG5hbWU6IHN0cmluZykge1xuICBsZXQgYWRkaXRpb25hbEF0dHJpYnV0ZXMgPSAnJztcbiAgaWYgKHBrZy5iYXplbEJpbiAmJiBwa2cuYmF6ZWxCaW5bbmFtZV0gJiYgcGtnLmJhemVsQmluW25hbWVdLmFkZGl0aW9uYWxBdHRyaWJ1dGVzKSB7XG4gICAgY29uc3QgYXR0cnMgPSBwa2cuYmF6ZWxCaW5bbmFtZV0uYWRkaXRpb25hbEF0dHJpYnV0ZXM7XG4gICAgZm9yIChjb25zdCBhdHRyTmFtZSBvZiBPYmplY3Qua2V5cyhhdHRycykpIHtcbiAgICAgIGNvbnN0IGF0dHJWYWx1ZSA9IGF0dHJzW2F0dHJOYW1lXTtcbiAgICAgIGFkZGl0aW9uYWxBdHRyaWJ1dGVzICs9IGBcXG4gICAgJHthdHRyTmFtZX0gPSAke2F0dHJWYWx1ZX0sYDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFkZGl0aW9uYWxBdHRyaWJ1dGVzO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgcGtnLCByZXR1cm4gdGhlIHNreWxhcmsgbm9kZWpzX2JpbmFyeSB0YXJnZXRzIGZvciB0aGUgcGFja2FnZS5cbiAqL1xuZnVuY3Rpb24gcHJpbnRQYWNrYWdlQmluKHBrZzogRGVwKSB7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBfZmluZEV4ZWN1dGFibGVzKHBrZyk7XG4gIGlmIChleGVjdXRhYmxlcy5zaXplKSB7XG4gICAgcmVzdWx0ID0gYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy86aW5kZXguYnpsXCIsIFwibm9kZWpzX2JpbmFyeVwiKVxuXG5gO1xuICAgIGNvbnN0IGRhdGEgPSBbYC8vJHtwa2cuX2Rpcn06JHtwa2cuX25hbWV9YF07XG4gICAgaWYgKHBrZy5fZHluYW1pY0RlcGVuZGVuY2llcykge1xuICAgICAgZGF0YS5wdXNoKC4uLnBrZy5fZHluYW1pY0RlcGVuZGVuY2llcyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgcGF0aF0gb2YgZXhlY3V0YWJsZXMuZW50cmllcygpKSB7XG4gICAgICByZXN1bHQgKz0gYCMgV2lyZSB1cCB0aGUgXFxgYmluXFxgIGVudHJ5IFxcYCR7bmFtZX1cXGBcbm5vZGVqc19iaW5hcnkoXG4gICAgbmFtZSA9IFwiJHtuYW1lfVwiLFxuICAgIGVudHJ5X3BvaW50ID0gXCIvLzpub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtwYXRofVwiLFxuICAgIGluc3RhbGxfc291cmNlX21hcF9zdXBwb3J0ID0gRmFsc2UsXG4gICAgZGF0YSA9IFske2RhdGEubWFwKHAgPT4gYFwiJHtwfVwiYCkuam9pbignLCAnKX1dLCR7YWRkaXRpb25hbEF0dHJpYnV0ZXMocGtnLCBuYW1lKX1cbilcblxuYDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBwcmludEluZGV4QnpsKHBrZzogRGVwKSB7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBfZmluZEV4ZWN1dGFibGVzKHBrZyk7XG4gIGlmIChleGVjdXRhYmxlcy5zaXplKSB7XG4gICAgcmVzdWx0ID0gYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy86aW5kZXguYnpsXCIsIFwibm9kZWpzX2JpbmFyeVwiLCBcIm5wbV9wYWNrYWdlX2JpblwiKVxuXG5gO1xuICAgIGNvbnN0IGRhdGEgPSBbYEAke1dPUktTUEFDRX0vLyR7cGtnLl9kaXJ9OiR7cGtnLl9uYW1lfWBdO1xuICAgIGlmIChwa2cuX2R5bmFtaWNEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGRhdGEucHVzaCguLi5wa2cuX2R5bmFtaWNEZXBlbmRlbmNpZXMpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIHBhdGhdIG9mIGV4ZWN1dGFibGVzLmVudHJpZXMoKSkge1xuICAgICAgcmVzdWx0ID0gYCR7cmVzdWx0fVxuXG4jIEdlbmVyYXRlZCBoZWxwZXIgbWFjcm8gdG8gY2FsbCAke25hbWV9XG5kZWYgJHtuYW1lLnJlcGxhY2UoLy0vZywgJ18nKX0oKiprd2FyZ3MpOlxuICAgIG91dHB1dF9kaXIgPSBrd2FyZ3MucG9wKFwib3V0cHV0X2RpclwiLCBGYWxzZSlcbiAgICBpZiBcIm91dHNcIiBpbiBrd2FyZ3Mgb3Igb3V0cHV0X2RpcjpcbiAgICAgICAgbnBtX3BhY2thZ2VfYmluKHRvb2wgPSBcIkAke1dPUktTUEFDRX0vLyR7cGtnLl9kaXJ9L2Jpbjoke1xuICAgICAgICAgIG5hbWV9XCIsIG91dHB1dF9kaXIgPSBvdXRwdXRfZGlyLCAqKmt3YXJncylcbiAgICBlbHNlOlxuICAgICAgICBub2RlanNfYmluYXJ5KFxuICAgICAgICAgICAgZW50cnlfcG9pbnQgPSBcIkAke1dPUktTUEFDRX0vLzpub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtwYXRofVwiLFxuICAgICAgICAgICAgaW5zdGFsbF9zb3VyY2VfbWFwX3N1cHBvcnQgPSBGYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBbJHtkYXRhLm1hcChwID0+IGBcIiR7cH1cImApLmpvaW4oJywgJyl9XSArIGt3YXJncy5wb3AoXCJkYXRhXCIsIFtdKSwke1xuICAgICAgICAgIGFkZGl0aW9uYWxBdHRyaWJ1dGVzKHBrZywgbmFtZSl9XG4gICAgICAgICAgICAqKmt3YXJnc1xuICAgICAgICApXG4gIGA7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbnR5cGUgRGVwID0ge1xuICBfZGlyOiBzdHJpbmcsXG4gIF9pc05lc3RlZDogYm9vbGVhbixcbiAgX2RlcGVuZGVuY2llczogRGVwW10sXG4gIF9maWxlczogc3RyaW5nW10sXG4gIFtrOiBzdHJpbmddOiBhbnlcbn1cblxuLyoqXG4gKiBHaXZlbiBhIHNjb3BlLCByZXR1cm4gdGhlIHNreWxhcmsgYG5vZGVfbW9kdWxlX2xpYnJhcnlgIHRhcmdldCBmb3IgdGhlIHNjb3BlLlxuICovXG5mdW5jdGlvbiBwcmludFNjb3BlKHNjb3BlOiBzdHJpbmcsIHBrZ3M6IERlcFtdKSB7XG4gIHBrZ3MgPSBwa2dzLmZpbHRlcihwa2cgPT4gIXBrZy5faXNOZXN0ZWQgJiYgcGtnLl9kaXIuc3RhcnRzV2l0aChgJHtzY29wZX0vYCkpO1xuICBsZXQgZGVwczogRGVwW10gPSBbXTtcbiAgcGtncy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgZGVwcyA9IGRlcHMuY29uY2F0KHBrZy5fZGVwZW5kZW5jaWVzLmZpbHRlcihkZXAgPT4gIWRlcC5faXNOZXN0ZWQgJiYgIXBrZ3MuaW5jbHVkZXMocGtnKSkpO1xuICB9KTtcbiAgLy8gZmlsdGVyIG91dCBkdXBsaWNhdGUgZGVwc1xuICBkZXBzID0gWy4uLnBrZ3MsIC4uLm5ldyBTZXQoZGVwcyldO1xuXG4gIGxldCBzcmNzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGRlcHMubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IGRlcHMubWFwKGRlcCA9PiBgXCIvLyR7ZGVwLl9kaXJ9OiR7ZGVwLl9uYW1lfV9fZmlsZXNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIHNyY3NTdGFybGFyayA9IGBcbiAgICAjIGRpcmVjdCBzb3VyY2VzIGxpc3RlZCBmb3Igc3RyaWN0IGRlcHMgc3VwcG9ydFxuICAgIHNyY3MgPSBbXG4gICAgICAgICR7bGlzdH1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgZGVwc1N0YXJsYXJrID0gJyc7XG4gIGlmIChkZXBzLmxlbmd0aCkge1xuICAgIGNvbnN0IGxpc3QgPSBkZXBzLm1hcChkZXAgPT4gYFwiLy8ke2RlcC5fZGlyfToke2RlcC5fbmFtZX1fX2NvbnRlbnRzXCIsYCkuam9pbignXFxuICAgICAgICAnKTtcbiAgICBkZXBzU3RhcmxhcmsgPSBgXG4gICAgIyBmbGF0dGVuZWQgbGlzdCBvZiBkaXJlY3QgYW5kIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIGhvaXN0ZWQgdG8gcm9vdCBieSB0aGUgcGFja2FnZSBtYW5hZ2VyXG4gICAgZGVwcyA9IFtcbiAgICAgICAgJHtsaXN0fVxuICAgIF0sYDtcbiAgfVxuXG4gIHJldHVybiBgbG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvL2ludGVybmFsL25wbV9pbnN0YWxsOm5vZGVfbW9kdWxlX2xpYnJhcnkuYnpsXCIsIFwibm9kZV9tb2R1bGVfbGlicmFyeVwiKVxuXG4jIEdlbmVyYXRlZCB0YXJnZXQgZm9yIG5wbSBzY29wZSAke3Njb3BlfVxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3Njb3BlfVwiLCR7c3Jjc1N0YXJsYXJrfSR7ZGVwc1N0YXJsYXJrfVxuKVxuXG5gO1xufVxuIl19