/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("build_bazel_rules_nodejs/internal/npm_install/generate_build_file", ["require", "exports", "fs", "path"], factory);
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
    const LOCK_FILE_LABEL = args[3];
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
        writeFileSync(path.posix.join(workspaceSourcePath, '_bazel_workspace_marker'), '# Marker file to used by custom copy_repository rule');
        bzlFile += `def install_${workspace}():
    _maybe(
        copy_repository,
        name = "${workspace}",
        marker_file = "@${WORKSPACE}//_workspaces/${workspace}:_bazel_workspace_marker",
        # Ensure that changes to the node_modules cause the copy to re-execute
        lock_file = "@${WORKSPACE}${LOCK_FILE_LABEL}",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVfYnVpbGRfZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL25wbV9pbnN0YWxsL2dlbmVyYXRlX2J1aWxkX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0lBQUE7Ozs7Ozs7Ozs7Ozs7OztPQWVHO0lBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDSCxZQUFZLENBQUM7O0lBR2IseUJBQXlCO0lBQ3pCLDZCQUE2QjtJQUU3QixTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVE7UUFDOUIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUM7WUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckYsQ0FBQztJQUVELE1BQU0saUJBQWlCLEdBQUc7Ozs7OztDQU16QixDQUFBO0lBRUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDekQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxD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LEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVuQyxJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEYsWUFBWSxHQUFHOzs7VUFHVCxJQUFJO09BQ1AsQ0FBQztTQUNMO1FBRUQsSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNGLFlBQVksR0FBRzs7O1VBR1QsSUFBSTtPQUNQLENBQUM7U0FDTDtRQUVELE9BQU87O21DQUUwQixLQUFLOztjQUUxQixLQUFLLEtBQUssWUFBWSxHQUFHLFlBQVk7OztDQUdsRCxDQUFDO0lBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IFRoZSBCYXplbCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFRoaXMgc2NyaXB0IGdlbmVyYXRlcyBCVUlMRC5iYXplbCBmaWxlcyBieSBhbmFseXppbmdcbiAqIHRoZSBub2RlX21vZHVsZXMgZm9sZGVyIGxheWVkIG91dCBieSB5YXJuIG9yIG5wbS4gSXQgZ2VuZXJhdGVzXG4gKiBmaW5lIGdyYWluZWQgQmF6ZWwgYG5vZGVfbW9kdWxlX2xpYnJhcnlgIHRhcmdldHMgZm9yIGVhY2ggcm9vdCBucG0gcGFja2FnZVxuICogYW5kIGFsbCBmaWxlcyBmb3IgdGhhdCBwYWNrYWdlIGFuZCBpdHMgdHJhbnNpdGl2ZSBkZXBzIGFyZSBpbmNsdWRlZFxuICogaW4gdGhlIHRhcmdldC4gRm9yIGV4YW1wbGUsIGBAPHdvcmtzcGFjZT4vL2phc21pbmVgIHdvdWxkXG4gKiBpbmNsdWRlIGFsbCBmaWxlcyBpbiB0aGUgamFzbWluZSBucG0gcGFja2FnZSBhbmQgYWxsIG9mIGl0c1xuICogdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMuXG4gKlxuICogbm9kZWpzX2JpbmFyeSB0YXJnZXRzIGFyZSBhbHNvIGdlbmVyYXRlZCBmb3IgYWxsIGBiaW5gIHNjcmlwdHNcbiAqIGluIGVhY2ggcGFja2FnZS4gRm9yIGV4YW1wbGUsIHRoZSBgQDx3b3Jrc3BhY2U+Ly9qYXNtaW5lL2JpbjpqYXNtaW5lYFxuICogdGFyZ2V0IHdpbGwgYmUgZ2VuZXJhdGVkIGZvciB0aGUgYGphc21pbmVgIGJpbmFyeSBpbiB0aGUgYGphc21pbmVgXG4gKiBucG0gcGFja2FnZS5cbiAqXG4gKiBBZGRpdGlvbmFsbHksIGEgYEA8d29ya3NwYWNlPi8vOm5vZGVfbW9kdWxlc2AgYG5vZGVfbW9kdWxlX2xpYnJhcnlgXG4gKiBpcyBnZW5lcmF0ZWQgdGhhdCBpbmNsdWRlcyBhbGwgcGFja2FnZXMgdW5kZXIgbm9kZV9tb2R1bGVzXG4gKiBhcyB3ZWxsIGFzIHRoZSAuYmluIGZvbGRlci5cbiAqXG4gKiBUaGlzIHdvcmsgaXMgYmFzZWQgb2ZmIHRoZSBmaW5lIGdyYWluZWQgZGVwcyBjb25jZXB0cyBpblxuICogaHR0cHM6Ly9naXRodWIuY29tL3B1YnJlZi9ydWxlc19ub2RlIGRldmVsb3BlZCBieSBAcGNqLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xQWZqSE1MVnlFX3ZZd2xIU0s3azd5V19JSUdwcFN4c1F0UG05UFRyMXhFb1xuICovXG4ndXNlIHN0cmljdCc7XG5cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZnVuY3Rpb24gbG9nX3ZlcmJvc2UoLi4ubTogYW55W10pIHtcbiAgaWYgKCEhcHJvY2Vzcy5lbnZbJ1ZFUkJPU0VfTE9HUyddKSBjb25zb2xlLmVycm9yKCdbZ2VuZXJhdGVfYnVpbGRfZmlsZS5qc10nLCAuLi5tKTtcbn1cblxuY29uc3QgQlVJTERfRklMRV9IRUFERVIgPSBgIyBHZW5lcmF0ZWQgZmlsZSBmcm9tIHlhcm5faW5zdGFsbC9ucG1faW5zdGFsbCBydWxlLlxuIyBTZWUgJChiYXplbCBpbmZvIG91dHB1dF9iYXNlKS9leHRlcm5hbC9idWlsZF9iYXplbF9ydWxlc19ub2RlanMvaW50ZXJuYWwvbnBtX2luc3RhbGwvZ2VuZXJhdGVfYnVpbGRfZmlsZS5qc1xuXG4jIEFsbCBydWxlcyBpbiBvdGhlciByZXBvc2l0b3JpZXMgY2FuIHVzZSB0aGVzZSB0YXJnZXRzXG5wYWNrYWdlKGRlZmF1bHRfdmlzaWJpbGl0eSA9IFtcIi8vdmlzaWJpbGl0eTpwdWJsaWNcIl0pXG5cbmBcblxuY29uc3QgYXJncyA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbmNvbnN0IFdPUktTUEFDRSA9IGFyZ3NbMF07XG5jb25zdCBSVUxFX1RZUEUgPSBhcmdzWzFdO1xuY29uc3QgRVJST1JfT05fQkFaRUxfRklMRVMgPSBwYXJzZUludChhcmdzWzJdKTtcbmNvbnN0IExPQ0tfRklMRV9MQUJFTCA9IGFyZ3NbM107XG5jb25zdCBJTkNMVURFRF9GSUxFUyA9IGFyZ3NbNF0gPyBhcmdzWzRdLnNwbGl0KCcsJykgOiBbXTtcbmNvbnN0IERZTkFNSUNfREVQUyA9IEpTT04ucGFyc2UoYXJnc1s1XSB8fCAne30nKTtcblxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIG1haW4oKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgZGlyZWN0b3J5IGFuZCBhbnkgbmVjZXNzYXJ5IHN1YmRpcmVjdG9yaWVzXG4gKiBpZiB0aGV5IGRvIG5vdCBleGlzdC5cbiAqL1xuZnVuY3Rpb24gbWtkaXJwKHA6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMocCkpIHtcbiAgICBta2RpcnAocGF0aC5kaXJuYW1lKHApKTtcbiAgICBmcy5ta2RpclN5bmMocCk7XG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgYSBmaWxlLCBmaXJzdCBlbnN1cmluZyB0aGF0IHRoZSBkaXJlY3RvcnkgdG9cbiAqIHdyaXRlIHRvIGV4aXN0cy5cbiAqL1xuZnVuY3Rpb24gd3JpdGVGaWxlU3luYyhwOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuICBta2RpcnAocGF0aC5kaXJuYW1lKHApKTtcbiAgZnMud3JpdGVGaWxlU3luYyhwLCBjb250ZW50KTtcbn1cblxuLyoqXG4gKiBNYWluIGVudHJ5cG9pbnQuXG4gKi9cbmZ1bmN0aW9uIG1haW4oKSB7XG4gIC8vIGZpbmQgYWxsIHBhY2thZ2VzIChpbmNsdWRpbmcgcGFja2FnZXMgaW4gbmVzdGVkIG5vZGVfbW9kdWxlcylcbiAgY29uc3QgcGtncyA9IGZpbmRQYWNrYWdlcygpO1xuXG4gIC8vIGZsYXR0ZW4gZGVwZW5kZW5jaWVzXG4gIGZsYXR0ZW5EZXBlbmRlbmNpZXMocGtncyk7XG5cbiAgLy8gZ2VuZXJhdGUgQmF6ZWwgd29ya3NwYWNlc1xuICBnZW5lcmF0ZUJhemVsV29ya3NwYWNlcyhwa2dzKVxuXG4gIC8vIGdlbmVyYXRlIGFsbCBCVUlMRCBmaWxlc1xuICBnZW5lcmF0ZUJ1aWxkRmlsZXMocGtncylcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1haW4sXG4gIHByaW50UGFja2FnZUJpbixcbiAgYWRkRHluYW1pY0RlcGVuZGVuY2llcyxcbiAgcHJpbnRJbmRleEJ6bCxcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGFsbCBidWlsZCBmaWxlc1xuICovXG5mdW5jdGlvbiBnZW5lcmF0ZUJ1aWxkRmlsZXMocGtnczogRGVwW10pIHtcbiAgZ2VuZXJhdGVSb290QnVpbGRGaWxlKHBrZ3MuZmlsdGVyKHBrZyA9PiAhcGtnLl9pc05lc3RlZCkpXG4gIHBrZ3MuZmlsdGVyKHBrZyA9PiAhcGtnLl9pc05lc3RlZCkuZm9yRWFjaChwa2cgPT4gZ2VuZXJhdGVQYWNrYWdlQnVpbGRGaWxlcyhwa2cpKTtcbiAgZmluZFNjb3BlcygpLmZvckVhY2goc2NvcGUgPT4gZ2VuZXJhdGVTY29wZUJ1aWxkRmlsZXMoc2NvcGUsIHBrZ3MpKTtcbn1cblxuLyoqXG4gKiBGbGF0dGVucyBkZXBlbmRlbmNpZXMgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5EZXBlbmRlbmNpZXMocGtnczogRGVwW10pIHtcbiAgY29uc3QgcGtnc01hcCA9IG5ldyBNYXAoKTtcbiAgcGtncy5mb3JFYWNoKHBrZyA9PiBwa2dzTWFwLnNldChwa2cuX2RpciwgcGtnKSk7XG4gIHBrZ3MuZm9yRWFjaChwa2cgPT4gZmxhdHRlblBrZ0RlcGVuZGVuY2llcyhwa2csIHBrZywgcGtnc01hcCkpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgQmF6ZWwgZmlsZXMgaW4gbnBtIGRpc3RyaWJ1dGlvbnMuXG4gKi9cbmZ1bmN0aW9uIGhpZGVCYXplbEZpbGVzKHBrZzogRGVwKSB7XG4gIGNvbnN0IGhhc0hpZGVCYXplbEZpbGVzID0gaXNEaXJlY3RvcnkoJ25vZGVfbW9kdWxlcy9AYmF6ZWwvaGlkZS1iYXplbC1maWxlcycpO1xuICBwa2cuX2ZpbGVzID0gcGtnLl9maWxlcy5tYXAoZmlsZSA9PiB7XG4gICAgY29uc3QgYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGUpO1xuICAgIGNvbnN0IGJhc2VuYW1lVWMgPSBiYXNlbmFtZS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChiYXNlbmFtZVVjID09PSAnQlVJTEQnIHx8IGJhc2VuYW1lVWMgPT09ICdCVUlMRC5CQVpFTCcpIHtcbiAgICAgIC8vIElmIGJhemVsIGZpbGVzIGFyZSBkZXRlY3RlZCBhbmQgdGhlcmUgaXMgbm8gQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXMgbnBtXG4gICAgICAvLyBwYWNrYWdlIHRoZW4gZXJyb3Igb3V0IGFuZCBzdWdnZXN0IGFkZGluZyB0aGUgcGFja2FnZS4gSXQgaXMgcG9zc2libGUgdG9cbiAgICAgIC8vIGhhdmUgYmF6ZWwgQlVJTEQgZmlsZXMgd2l0aCB0aGUgcGFja2FnZSBpbnN0YWxsZWQgYXMgaXQncyBwb3N0aW5zdGFsbFxuICAgICAgLy8gc3RlcCwgd2hpY2ggaGlkZXMgYmF6ZWwgQlVJTEQgZmlsZXMsIG9ubHkgcnVucyB3aGVuIHRoZSBAYmF6ZWwvaGlkZS1iYXplbC1maWxlc1xuICAgICAgLy8gaXMgaW5zdGFsbGVkIGFuZCBub3Qgd2hlbiBuZXcgcGFja2FnZXMgYXJlIGFkZGVkICh2aWEgYHlhcm4gYWRkYFxuICAgICAgLy8gZm9yIGV4YW1wbGUpIGFmdGVyIHRoZSBpbml0aWFsIGluc3RhbGwuIEluIHRoaXMgY2FzZSwgaG93ZXZlciwgdGhlIHJlcG8gcnVsZVxuICAgICAgLy8gd2lsbCByZS1ydW4gYXMgdGhlIHBhY2thZ2UuanNvbiAmJiBsb2NrIGZpbGUgaGFzIGNoYW5nZWQgc28gd2UganVzdFxuICAgICAgLy8gaGlkZSB0aGUgYWRkZWQgQlVJTEQgZmlsZXMgZHVyaW5nIHRoZSByZXBvIHJ1bGUgcnVuIGhlcmUgc2luY2UgQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXNcbiAgICAgIC8vIHdhcyBub3QgcnVuLlxuICAgICAgaWYgKCFoYXNIaWRlQmF6ZWxGaWxlcyAmJiBFUlJPUl9PTl9CQVpFTF9GSUxFUykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBucG0gcGFja2FnZSAnJHtwa2cuX2Rpcn0nIGZyb20gQCR7V09SS1NQQUNFfSAke1JVTEVfVFlQRX0gcnVsZVxuaGFzIGEgQmF6ZWwgQlVJTEQgZmlsZSAnJHtmaWxlfScuIFVzZSB0aGUgQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXMgdXRpbGl0eSB0byBoaWRlIHRoZXNlIGZpbGVzLlxuU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9ibG9iL21hc3Rlci9wYWNrYWdlcy9oaWRlLWJhemVsLWZpbGVzL1JFQURNRS5tZFxuZm9yIGluc3RhbGxhdGlvbiBpbnN0cnVjdGlvbnMuYCk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEFsbCBCYXplbCBmaWxlcyBpbiB0aGUgbnBtIGRpc3RyaWJ1dGlvbiBzaG91bGQgYmUgcmVuYW1lZCBieVxuICAgICAgICAvLyBhZGRpbmcgYSBgX2AgcHJlZml4IHNvIHRoYXQgZmlsZSB0YXJnZXRzIGRvbid0IGNyb3NzIHBhY2thZ2UgYm91bmRhcmllcy5cbiAgICAgICAgY29uc3QgbmV3RmlsZSA9IHBhdGgucG9zaXguam9pbihwYXRoLmRpcm5hbWUoZmlsZSksIGBfJHtiYXNlbmFtZX1gKTtcbiAgICAgICAgY29uc3Qgc3JjUGF0aCA9IHBhdGgucG9zaXguam9pbignbm9kZV9tb2R1bGVzJywgcGtnLl9kaXIsIGZpbGUpO1xuICAgICAgICBjb25zdCBkc3RQYXRoID0gcGF0aC5wb3NpeC5qb2luKCdub2RlX21vZHVsZXMnLCBwa2cuX2RpciwgbmV3RmlsZSk7XG4gICAgICAgIGZzLnJlbmFtZVN5bmMoc3JjUGF0aCwgZHN0UGF0aCk7XG4gICAgICAgIHJldHVybiBuZXdGaWxlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmlsZTtcbiAgfSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIHRoZSByb290IEJVSUxEIGZpbGUuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlUm9vdEJ1aWxkRmlsZShwa2dzOiBEZXBbXSkge1xuICBsZXQgZXhwb3J0c1N0YXJsYXJrID0gJyc7XG4gIHBrZ3MuZm9yRWFjaChwa2cgPT4ge3BrZy5fZmlsZXMuZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICAgZXhwb3J0c1N0YXJsYXJrICs9IGAgICAgXCJub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtmfVwiLFxuYDtcbiAgICAgICAgICAgICAgIH0pfSk7XG5cbiAgbGV0IHNyY3NTdGFybGFyayA9ICcnO1xuICBpZiAocGtncy5sZW5ndGgpIHtcbiAgICBjb25zdCBsaXN0ID0gcGtncy5tYXAocGtnID0+IGBcIi8vJHtwa2cuX2Rpcn06JHtwa2cuX25hbWV9X19maWxlc1wiLGApLmpvaW4oJ1xcbiAgICAgICAgJyk7XG4gICAgc3Jjc1N0YXJsYXJrID0gYFxuICAgICMgZGlyZWN0IHNvdXJjZXMgbGlzdGVkIGZvciBzdHJpY3QgZGVwcyBzdXBwb3J0XG4gICAgc3JjcyA9IFtcbiAgICAgICAgJHtsaXN0fVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBkZXBzU3RhcmxhcmsgPSAnJztcbiAgaWYgKHBrZ3MubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IHBrZ3MubWFwKHBrZyA9PiBgXCIvLyR7cGtnLl9kaXJ9OiR7cGtnLl9uYW1lfV9fY29udGVudHNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIGRlcHNTdGFybGFyayA9IGBcbiAgICAjIGZsYXR0ZW5lZCBsaXN0IG9mIGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgaG9pc3RlZCB0byByb290IGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXJcbiAgICBkZXBzID0gW1xuICAgICAgICAke2xpc3R9XG4gICAgXSxgO1xuICB9XG5cbiAgbGV0IGJ1aWxkRmlsZSA9IEJVSUxEX0ZJTEVfSEVBREVSICtcbiAgICAgIGBsb2FkKFwiQGJ1aWxkX2JhemVsX3J1bGVzX25vZGVqcy8vaW50ZXJuYWwvbnBtX2luc3RhbGw6bm9kZV9tb2R1bGVfbGlicmFyeS5iemxcIiwgXCJub2RlX21vZHVsZV9saWJyYXJ5XCIpXG5cbmV4cG9ydHNfZmlsZXMoW1xuJHtleHBvcnRzU3Rhcmxhcmt9XSlcblxuIyBUaGUgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSBpbiBvbmUgY2F0Y2gtYWxsIG5vZGVfbW9kdWxlX2xpYnJhcnkuXG4jIE5COiBVc2luZyB0aGlzIHRhcmdldCBtYXkgaGF2ZSBiYWQgcGVyZm9ybWFuY2UgaW1wbGljYXRpb25zIGlmXG4jIHRoZXJlIGFyZSBtYW55IGZpbGVzIGluIHRhcmdldC5cbiMgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy81MTUzLlxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCJub2RlX21vZHVsZXNcIiwke3NyY3NTdGFybGFya30ke2RlcHNTdGFybGFya31cbilcblxuYFxuXG4gIC8vIEFkZCB0aGUgbWFudWFsIGJ1aWxkIGZpbGUgY29udGVudHMgaWYgdGhleSBleGlzdHNcbiAgdHJ5IHtcbiAgICBidWlsZEZpbGUgKz0gZnMucmVhZEZpbGVTeW5jKGBtYW51YWxfYnVpbGRfZmlsZV9jb250ZW50c2AsIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgfVxuXG4gIHdyaXRlRmlsZVN5bmMoJ0JVSUxELmJhemVsJywgYnVpbGRGaWxlKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYWxsIEJVSUxEICYgYnpsIGZpbGVzIGZvciBhIHBhY2thZ2UuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlUGFja2FnZUJ1aWxkRmlsZXMocGtnOiBEZXApIHtcbiAgbGV0IGJ1aWxkRmlsZSA9IHByaW50UGFja2FnZShwa2cpO1xuXG4gIGNvbnN0IGJpbkJ1aWxkRmlsZSA9IHByaW50UGFja2FnZUJpbihwa2cpO1xuICBpZiAoYmluQnVpbGRGaWxlLmxlbmd0aCkge1xuICAgIHdyaXRlRmlsZVN5bmMoXG4gICAgICAgIHBhdGgucG9zaXguam9pbihwa2cuX2RpciwgJ2JpbicsICdCVUlMRC5iYXplbCcpLCBCVUlMRF9GSUxFX0hFQURFUiArIGJpbkJ1aWxkRmlsZSk7XG4gIH1cblxuICBjb25zdCBpbmRleEZpbGUgPSBwcmludEluZGV4QnpsKHBrZyk7XG4gIGlmIChpbmRleEZpbGUubGVuZ3RoKSB7XG4gICAgd3JpdGVGaWxlU3luYyhwYXRoLnBvc2l4LmpvaW4ocGtnLl9kaXIsICdpbmRleC5iemwnKSwgaW5kZXhGaWxlKTtcbiAgICBidWlsZEZpbGUgPSBgJHtidWlsZEZpbGV9XG4jIEZvciBpbnRlZ3JhdGlvbiB0ZXN0aW5nXG5leHBvcnRzX2ZpbGVzKFtcImluZGV4LmJ6bFwiXSlcbmA7XG4gIH1cblxuICB3cml0ZUZpbGVTeW5jKHBhdGgucG9zaXguam9pbihwa2cuX2RpciwgJ0JVSUxELmJhemVsJyksIEJVSUxEX0ZJTEVfSEVBREVSICsgYnVpbGRGaWxlKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBpbnN0YWxsXzx3b3Jrc3BhY2VfbmFtZT4uYnpsIGZpbGVzIHdpdGggZnVuY3Rpb24gdG8gaW5zdGFsbCBlYWNoIHdvcmtzcGFjZS5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVCYXplbFdvcmtzcGFjZXMocGtnczogRGVwW10pIHtcbiAgY29uc3Qgd29ya3NwYWNlczogQmFnPHN0cmluZz4gPSB7fTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBwa2dzKSB7XG4gICAgaWYgKCFwa2cuYmF6ZWxXb3Jrc3BhY2VzKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHdvcmtzcGFjZSBvZiBPYmplY3Qua2V5cyhwa2cuYmF6ZWxXb3Jrc3BhY2VzKSkge1xuICAgICAgLy8gQSBiYXplbCB3b3Jrc3BhY2UgY2FuIG9ubHkgYmUgc2V0dXAgYnkgb25lIG5wbSBwYWNrYWdlXG4gICAgICBpZiAod29ya3NwYWNlc1t3b3Jrc3BhY2VdKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICBgQ291bGQgbm90IHNldHVwIEJhemVsIHdvcmtzcGFjZSAke3dvcmtzcGFjZX0gcmVxdWVzdGVkIGJ5IG5wbSBgICtcbiAgICAgICAgICAgIGBwYWNrYWdlICR7cGtnLl9kaXJ9QCR7cGtnLnZlcnNpb259LiBBbHJlYWR5IHNldHVwIGJ5ICR7d29ya3NwYWNlc1t3b3Jrc3BhY2VdfWApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9XG5cbiAgICAgIGdlbmVyYXRlQmF6ZWxXb3Jrc3BhY2UocGtnLCB3b3Jrc3BhY2UpO1xuXG4gICAgICAvLyBLZWVwIHRyYWNrIG9mIHdoaWNoIG5wbSBwYWNrYWdlIHNldHVwIHRoaXMgYmF6ZWwgd29ya3NwYWNlIGZvciBsYXRlciB1c2VcbiAgICAgIHdvcmtzcGFjZXNbd29ya3NwYWNlXSA9IGAke3BrZy5fZGlyfUAke3BrZy52ZXJzaW9ufWA7XG4gICAgfVxuICB9XG5cbiAgLy8gRmluYWxseSBnZW5lcmF0ZSBpbnN0YWxsX2JhemVsX2RlcGVuZGVuY2llcy5iemxcbiAgZ2VuZXJhdGVJbnN0YWxsQmF6ZWxEZXBlbmRlbmNpZXMoT2JqZWN0LmtleXMod29ya3NwYWNlcykpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGluc3RhbGxfPHdvcmtzcGFjZT4uYnpsIGZpbGUgd2l0aCBmdW5jdGlvbiB0byBpbnN0YWxsIHRoZSB3b3Jrc3BhY2UuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlQmF6ZWxXb3Jrc3BhY2UocGtnOiBEZXAsIHdvcmtzcGFjZTogc3RyaW5nKSB7XG4gIGxldCBiemxGaWxlID0gYCMgR2VuZXJhdGVkIGJ5IHRoZSB5YXJuX2luc3RhbGwvbnBtX2luc3RhbGwgcnVsZVxubG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvL2ludGVybmFsL2NvcHlfcmVwb3NpdG9yeTpjb3B5X3JlcG9zaXRvcnkuYnpsXCIsIFwiY29weV9yZXBvc2l0b3J5XCIpXG5cbmRlZiBfbWF5YmUocmVwb19ydWxlLCBuYW1lLCAqKmt3YXJncyk6XG4gICAgaWYgbmFtZSBub3QgaW4gbmF0aXZlLmV4aXN0aW5nX3J1bGVzKCk6XG4gICAgICAgIHJlcG9fcnVsZShuYW1lID0gbmFtZSwgKiprd2FyZ3MpXG5gO1xuXG4gIGNvbnN0IHJvb3RQYXRoID0gcGtnLmJhemVsV29ya3NwYWNlc1t3b3Jrc3BhY2VdLnJvb3RQYXRoO1xuICBpZiAoIXJvb3RQYXRoKSB7XG4gICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgYE1hbGZvcm1lZCBiYXplbFdvcmtzcGFjZXMgYXR0cmlidXRlIGluICR7cGtnLl9kaXJ9QCR7cGtnLnZlcnNpb259LiBgICtcbiAgICAgICAgYE1pc3Npbmcgcm9vdFBhdGggZm9yIHdvcmtzcGFjZSAke3dvcmtzcGFjZX0uYCk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG5cbiAgLy8gQ29weSBhbGwgZmlsZXMgZm9yIHRoaXMgd29ya3NwYWNlIHRvIGEgZm9sZGVyIHVuZGVyIF93b3Jrc3BhY2VzXG4gIC8vIHRvIHJlc3RvcmUgdGhlIEJhemVsIGZpbGVzIHdoaWNoIGhhdmUgYmUgcmVuYW1lZCBmcm9tIHRoZSBucG0gcGFja2FnZVxuICBjb25zdCB3b3Jrc3BhY2VTb3VyY2VQYXRoID0gcGF0aC5wb3NpeC5qb2luKCdfd29ya3NwYWNlcycsIHdvcmtzcGFjZSk7XG4gIG1rZGlycCh3b3Jrc3BhY2VTb3VyY2VQYXRoKTtcbiAgcGtnLl9maWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xuICAgIGlmICgvXm5vZGVfbW9kdWxlc1svXFxcXF0vLnRlc3QoZmlsZSkpIHtcbiAgICAgIC8vIGRvbid0IGNvcHkgb3ZlciBuZXN0ZWQgbm9kZV9tb2R1bGVzXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBkZXN0RmlsZSA9IHBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpO1xuICAgIGlmIChkZXN0RmlsZS5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICAvLyB0aGlzIGZpbGUgaXMgbm90IHVuZGVyIHRoZSByb290UGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSk7XG4gICAgY29uc3QgYmFzZW5hbWVVYyA9IGJhc2VuYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgLy8gQmF6ZWwgQlVJTEQgZmlsZXMgZnJvbSBucG0gZGlzdHJpYnV0aW9uIHdvdWxkIGhhdmUgYmVlbiByZW5hbWVkIGVhcmxpZXIgd2l0aCBhIF8gcHJlZml4IHNvXG4gICAgLy8gd2UgcmVzdG9yZSB0aGUgbmFtZSBvbiB0aGUgY29weVxuICAgIGlmIChiYXNlbmFtZVVjID09PSAnX0JVSUxEJyB8fCBiYXNlbmFtZVVjID09PSAnX0JVSUxELkJBWkVMJykge1xuICAgICAgZGVzdEZpbGUgPSBwYXRoLnBvc2l4LmpvaW4ocGF0aC5kaXJuYW1lKGRlc3RGaWxlKSwgYmFzZW5hbWUuc3Vic3RyKDEpKTtcbiAgICB9XG4gICAgY29uc3Qgc3JjID0gcGF0aC5wb3NpeC5qb2luKCdub2RlX21vZHVsZXMnLCBwa2cuX2RpciwgZmlsZSk7XG4gICAgY29uc3QgZGVzdCA9IHBhdGgucG9zaXguam9pbih3b3Jrc3BhY2VTb3VyY2VQYXRoLCBkZXN0RmlsZSk7XG4gICAgbWtkaXJwKHBhdGguZGlybmFtZShkZXN0KSk7XG4gICAgZnMuY29weUZpbGVTeW5jKHNyYywgZGVzdCk7XG4gIH0pO1xuXG4gIC8vIFdlIGNyZWF0ZSBfYmF6ZWxfd29ya3NwYWNlX21hcmtlciB0aGF0IGlzIHVzZWQgYnkgdGhlIGN1c3RvbSBjb3B5X3JlcG9zaXRvcnlcbiAgLy8gcnVsZSB0byByZXNvbHZlIHRoZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IHNvdXJjZSByb290LiBBIHJvb3QgQlVJTEQgZmlsZVxuICAvLyBpcyByZXF1aXJlZCB0byByZWZlcmVuY2UgX2JhemVsX3dvcmtzcGFjZV9tYXJrZXIgYXMgYSB0YXJnZXQgc28gd2UgYWxzbyBjcmVhdGVcbiAgLy8gYW4gZW1wdHkgb25lIGlmIG9uZSBkb2VzIG5vdCBleGlzdC5cbiAgaWYgKCFoYXNSb290QnVpbGRGaWxlKHBrZywgcm9vdFBhdGgpKSB7XG4gICAgd3JpdGVGaWxlU3luYyhcbiAgICAgICAgcGF0aC5wb3NpeC5qb2luKHdvcmtzcGFjZVNvdXJjZVBhdGgsICdCVUlMRC5iYXplbCcpLFxuICAgICAgICAnIyBNYXJrZXIgZmlsZSB0aGF0IHRoaXMgZGlyZWN0b3J5IGlzIGEgYmF6ZWwgcGFja2FnZScpO1xuICB9XG4gIHdyaXRlRmlsZVN5bmMoXG4gICAgICBwYXRoLnBvc2l4LmpvaW4od29ya3NwYWNlU291cmNlUGF0aCwgJ19iYXplbF93b3Jrc3BhY2VfbWFya2VyJyksXG4gICAgICAnIyBNYXJrZXIgZmlsZSB0byB1c2VkIGJ5IGN1c3RvbSBjb3B5X3JlcG9zaXRvcnkgcnVsZScpO1xuXG4gIGJ6bEZpbGUgKz0gYGRlZiBpbnN0YWxsXyR7d29ya3NwYWNlfSgpOlxuICAgIF9tYXliZShcbiAgICAgICAgY29weV9yZXBvc2l0b3J5LFxuICAgICAgICBuYW1lID0gXCIke3dvcmtzcGFjZX1cIixcbiAgICAgICAgbWFya2VyX2ZpbGUgPSBcIkAke1dPUktTUEFDRX0vL193b3Jrc3BhY2VzLyR7d29ya3NwYWNlfTpfYmF6ZWxfd29ya3NwYWNlX21hcmtlclwiLFxuICAgICAgICAjIEVuc3VyZSB0aGF0IGNoYW5nZXMgdG8gdGhlIG5vZGVfbW9kdWxlcyBjYXVzZSB0aGUgY29weSB0byByZS1leGVjdXRlXG4gICAgICAgIGxvY2tfZmlsZSA9IFwiQCR7V09SS1NQQUNFfSR7TE9DS19GSUxFX0xBQkVMfVwiLFxuICAgIClcbmA7XG5cbiAgd3JpdGVGaWxlU3luYyhgaW5zdGFsbF8ke3dvcmtzcGFjZX0uYnpsYCwgYnpsRmlsZSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgaW5zdGFsbF9iYXplbF9kZXBlbmRlbmNpZXMuYnpsIHdpdGggZnVuY3Rpb24gdG8gaW5zdGFsbCBhbGwgd29ya3NwYWNlcy5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVJbnN0YWxsQmF6ZWxEZXBlbmRlbmNpZXMod29ya3NwYWNlczogc3RyaW5nW10pIHtcbiAgbGV0IGJ6bEZpbGUgPSBgIyBHZW5lcmF0ZWQgYnkgdGhlIHlhcm5faW5zdGFsbC9ucG1faW5zdGFsbCBydWxlXG5gO1xuICB3b3Jrc3BhY2VzLmZvckVhY2god29ya3NwYWNlID0+IHtcbiAgICBiemxGaWxlICs9IGBsb2FkKFxcXCI6aW5zdGFsbF8ke3dvcmtzcGFjZX0uYnpsXFxcIiwgXFxcImluc3RhbGxfJHt3b3Jrc3BhY2V9XFxcIilcbmA7XG4gIH0pO1xuICBiemxGaWxlICs9IGBkZWYgaW5zdGFsbF9iYXplbF9kZXBlbmRlbmNpZXMoKTpcbiAgICBcIlwiXCJJbnN0YWxscyBhbGwgd29ya3NwYWNlcyBsaXN0ZWQgaW4gYmF6ZWxXb3Jrc3BhY2VzIG9mIGFsbCBucG0gcGFja2FnZXNcIlwiXCJcbmA7XG4gIHdvcmtzcGFjZXMuZm9yRWFjaCh3b3Jrc3BhY2UgPT4ge1xuICAgIGJ6bEZpbGUgKz0gYCAgICBpbnN0YWxsXyR7d29ya3NwYWNlfSgpXG5gO1xuICB9KTtcblxuICB3cml0ZUZpbGVTeW5jKCdpbnN0YWxsX2JhemVsX2RlcGVuZGVuY2llcy5iemwnLCBiemxGaWxlKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBidWlsZCBmaWxlcyBmb3IgYSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVTY29wZUJ1aWxkRmlsZXMoc2NvcGU6IHN0cmluZywgcGtnczogRGVwW10pIHtcbiAgY29uc3QgYnVpbGRGaWxlID0gQlVJTERfRklMRV9IRUFERVIgKyBwcmludFNjb3BlKHNjb3BlLCBwa2dzKTtcbiAgd3JpdGVGaWxlU3luYyhwYXRoLnBvc2l4LmpvaW4oc2NvcGUsICdCVUlMRC5iYXplbCcpLCBidWlsZEZpbGUpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBhIHBhdGggaXMgYSBmaWxlLlxuICovXG5mdW5jdGlvbiBpc0ZpbGUocDogc3RyaW5nKSB7XG4gIHJldHVybiBmcy5leGlzdHNTeW5jKHApICYmIGZzLnN0YXRTeW5jKHApLmlzRmlsZSgpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBhIHBhdGggaXMgYW4gbnBtIHBhY2thZ2Ugd2hpY2ggaXMgaXMgYSBkaXJlY3Rvcnkgd2l0aCBhIHBhY2thZ2UuanNvbiBmaWxlLlxuICovXG5mdW5jdGlvbiBpc0RpcmVjdG9yeShwOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGZzLmV4aXN0c1N5bmMocCkgJiYgZnMuc3RhdFN5bmMocCkuaXNEaXJlY3RvcnkoKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIGFsbCB0aGUgZmlsZXMgdW5kZXIgYSBkaXJlY3RvcnkgYXMgcmVsYXRpdmVcbiAqIHBhdGhzIHRvIHRoZSBkaXJlY3RvcnkuXG4gKi9cbmZ1bmN0aW9uIGxpc3RGaWxlcyhyb290RGlyOiBzdHJpbmcsIHN1YkRpcjogc3RyaW5nID0gJycpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGRpciA9IHBhdGgucG9zaXguam9pbihyb290RGlyLCBzdWJEaXIpO1xuICBpZiAoIWlzRGlyZWN0b3J5KGRpcikpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGRpcilcbiAgICAgIC5yZWR1Y2UoXG4gICAgICAgICAgKGZpbGVzOiBzdHJpbmdbXSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnBvc2l4LmpvaW4oZGlyLCBmaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbFBhdGggPSBwYXRoLnBvc2l4LmpvaW4oc3ViRGlyLCBmaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IGlzU3ltYm9saWNMaW5rID0gZnMubHN0YXRTeW5jKGZ1bGxQYXRoKS5pc1N5bWJvbGljTGluaygpO1xuICAgICAgICAgICAgbGV0IHN0YXQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBpZiAoaXNTeW1ib2xpY0xpbmspIHtcbiAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IGJyb2tlbiBzeW1ib2xpYyBsaW5rcy4gVGhlc2UgY2F1c2UgZnMuc3RhdFN5bmMoZnVsbFBhdGgpXG4gICAgICAgICAgICAgICAgLy8gdG8gZmFpbCB3aXRoIGBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgLi4uYFxuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlcztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaXNEaXJlY3RvcnkgPSBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICBpZiAoaXNEaXJlY3RvcnkgJiYgaXNTeW1ib2xpY0xpbmspIHtcbiAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBzeW1ib2xpYyBsaW5rcyB0byBkaXJlY3Rvcmllcy4gQW4gaXNzdWUgaW4geWFybiB2ZXJzaW9uc1xuICAgICAgICAgICAgICAvLyBvbGRlciB0aGFuIDEuMTIuMSBjcmVhdGVzIHN5bWJvbGljIGxpbmtzIHRvIGZvbGRlcnMgaW4gdGhlIC5iaW4gZm9sZGVyXG4gICAgICAgICAgICAgIC8vIHdoaWNoIGxlYWRzIHRvIEJhemVsIHRhcmdldHMgdGhhdCBjcm9zcyBwYWNrYWdlIGJvdW5kYXJpZXMuXG4gICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzQyOCBhbmRcbiAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy80MzguXG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgdGVzdGVkIGluIC9lMmUvZmluZV9ncmFpbmVkX3N5bWxpbmtzLlxuICAgICAgICAgICAgICByZXR1cm4gZmlsZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaXNEaXJlY3RvcnkgPyBmaWxlcy5jb25jYXQobGlzdEZpbGVzKHJvb3REaXIsIHJlbFBhdGgpKSA6IGZpbGVzLmNvbmNhdChyZWxQYXRoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKVxuICAgICAgLy8gRmlsZXMgd2l0aCBzcGFjZXMgKFxceDIwKSBvciB1bmljb2RlIGNoYXJhY3RlcnMgKDxcXHgyMCAmJiA+XFx4N0UpIGFyZSBub3QgYWxsb3dlZCBpblxuICAgICAgLy8gQmF6ZWwgcnVuZmlsZXMuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvNDMyN1xuICAgICAgLmZpbHRlcihmID0+ICEvW15cXHgyMS1cXHg3RV0vLnRlc3QoZikpXG4gICAgICAvLyBXZSByZXR1cm4gYSBzb3J0ZWQgYXJyYXkgc28gdGhhdCB0aGUgb3JkZXIgb2YgZmlsZXNcbiAgICAgIC8vIGlzIHRoZSBzYW1lIHJlZ2FyZGxlc3Mgb2YgcGxhdGZvcm1cbiAgICAgIC5zb3J0KCk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBucG0gcGFja2FnZSBkaXN0cmlidXRpb24gY29udGFpbmVkIGFcbiAqIHJvb3QgL0JVSUxEIG9yIC9CVUlMRC5iYXplbCBmaWxlLlxuICovXG5mdW5jdGlvbiBoYXNSb290QnVpbGRGaWxlKHBrZzogRGVwLCByb290UGF0aDogc3RyaW5nKSB7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBwa2cuX2ZpbGVzKSB7XG4gICAgLy8gQmF6ZWwgZmlsZXMgd291bGQgaGF2ZSBiZWVuIHJlbmFtZWQgZWFybGllciB3aXRoIGEgYF9gIHByZWZpeFxuICAgIGNvbnN0IGZpbGVVYyA9IHBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKGZpbGVVYyA9PT0gJ19CVUlMRCcgfHwgZmlsZVVjID09PSAnX0JVSUxELkJBWkVMJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBhZGREeW5hbWljRGVwZW5kZW5jaWVzKHBrZ3M6IERlcFtdLCBkeW5hbWljX2RlcHMgPSBEWU5BTUlDX0RFUFMpIHtcbiAgZnVuY3Rpb24gbWF0Y2gobmFtZTogc3RyaW5nLCBwOiBEZXApIHtcbiAgICAvLyBBdXRvbWF0aWNhbGx5IGluY2x1ZGUgZHluYW1pYyBkZXBlbmRlbmN5IG9uIHBsdWdpbnMgb2YgdGhlIGZvcm0gcGtnLXBsdWdpbi1mb29cbiAgICBpZiAobmFtZS5zdGFydHNXaXRoKGAke3AuX21vZHVsZU5hbWV9LXBsdWdpbi1gKSkgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCB2YWx1ZSA9IGR5bmFtaWNfZGVwc1twLl9tb2R1bGVOYW1lXTtcbiAgICBpZiAobmFtZSA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gU3VwcG9ydCB3aWxkY2FyZCBtYXRjaFxuICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5pbmNsdWRlcygnKicpICYmIG5hbWUuc3RhcnRzV2l0aCh2YWx1ZS5zdWJzdHJpbmcoMCwgdmFsdWUuaW5kZXhPZignKicpKSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBwa2dzLmZvckVhY2gocCA9PiB7XG4gICAgcC5fZHluYW1pY0RlcGVuZGVuY2llcyA9IHBrZ3MuZmlsdGVyKHggPT4gISF4Ll9tb2R1bGVOYW1lICYmIG1hdGNoKHguX21vZHVsZU5hbWUsIHApKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkeW4gPT4gYC8vJHtkeW4uX2Rpcn06JHtkeW4uX25hbWV9YCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpbmRzIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIGFsbCBwYWNrYWdlcyB1bmRlciBhIGdpdmVuIHBhdGguXG4gKi9cbmZ1bmN0aW9uIGZpbmRQYWNrYWdlcyhwID0gJ25vZGVfbW9kdWxlcycpIHtcbiAgaWYgKCFpc0RpcmVjdG9yeShwKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IHBrZ3M6IERlcFtdID0gW107XG5cbiAgY29uc3QgbGlzdGluZyA9IGZzLnJlYWRkaXJTeW5jKHApO1xuXG4gIGNvbnN0IHBhY2thZ2VzID0gbGlzdGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IHNjb3Blc1xuICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gIWYuc3RhcnRzV2l0aCgnQCcpKVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IGZvbGRlcnMgc3VjaCBhcyBgLmJpbmAgd2hpY2ggY2FuIGNyZWF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBpc3N1ZXMgb24gV2luZG93cyBzaW5jZSB0aGVzZSBhcmUgXCJoaWRkZW5cIiBieSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZiA9PiAhZi5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBwYXRoLnBvc2l4LmpvaW4ocCwgZikpXG4gICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZiA9PiBpc0RpcmVjdG9yeShmKSk7XG5cbiAgcGFja2FnZXMuZm9yRWFjaChcbiAgICAgIGYgPT4gcGtncy5wdXNoKHBhcnNlUGFja2FnZShmKSwgLi4uZmluZFBhY2thZ2VzKHBhdGgucG9zaXguam9pbihmLCAnbm9kZV9tb2R1bGVzJykpKSk7XG5cbiAgY29uc3Qgc2NvcGVzID0gbGlzdGluZy5maWx0ZXIoZiA9PiBmLnN0YXJ0c1dpdGgoJ0AnKSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBwYXRoLnBvc2l4LmpvaW4ocCwgZikpXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gaXNEaXJlY3RvcnkoZikpO1xuICBzY29wZXMuZm9yRWFjaChmID0+IHBrZ3MucHVzaCguLi5maW5kUGFja2FnZXMoZikpKTtcblxuICBhZGREeW5hbWljRGVwZW5kZW5jaWVzKHBrZ3MpO1xuXG4gIHJldHVybiBwa2dzO1xufVxuXG4vKipcbiAqIEZpbmRzIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIGFsbCBwYWNrYWdlIHNjb3BlcyBpbiBub2RlX21vZHVsZXMuXG4gKi9cbmZ1bmN0aW9uIGZpbmRTY29wZXMoKSB7XG4gIGNvbnN0IHAgPSAnbm9kZV9tb2R1bGVzJztcbiAgaWYgKCFpc0RpcmVjdG9yeShwKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IGxpc3RpbmcgPSBmcy5yZWFkZGlyU3luYyhwKTtcblxuICBjb25zdCBzY29wZXMgPSBsaXN0aW5nLmZpbHRlcihmID0+IGYuc3RhcnRzV2l0aCgnQCcpKVxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmID0+IHBhdGgucG9zaXguam9pbihwLCBmKSlcbiAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZiA9PiBpc0RpcmVjdG9yeShmKSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBmLnJlcGxhY2UoL15ub2RlX21vZHVsZXNcXC8vLCAnJykpO1xuXG4gIHJldHVybiBzY29wZXM7XG59XG5cbi8qKlxuICogR2l2ZW4gdGhlIG5hbWUgb2YgYSB0b3AtbGV2ZWwgZm9sZGVyIGluIG5vZGVfbW9kdWxlcywgcGFyc2UgdGhlXG4gKiBwYWNrYWdlIGpzb24gYW5kIHJldHVybiBpdCBhcyBhbiBvYmplY3QgYWxvbmcgd2l0aFxuICogc29tZSBhZGRpdGlvbmFsIGludGVybmFsIGF0dHJpYnV0ZXMgcHJlZml4ZWQgd2l0aCAnXycuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlUGFja2FnZShwOiBzdHJpbmcpOiBEZXAge1xuICAvLyBQYXJzZSB0aGUgcGFja2FnZS5qc29uIGZpbGUgb2YgdGhpcyBwYWNrYWdlXG4gIGNvbnN0IHBhY2thZ2VKc29uID0gcGF0aC5wb3NpeC5qb2luKHAsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGtnID0gaXNGaWxlKHBhY2thZ2VKc29uKSA/IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCB7ZW5jb2Rpbmc6ICd1dGY4J30pKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dmVyc2lvbjogJzAuMC4wJ307XG5cbiAgLy8gVHJpbSB0aGUgbGVhZGluZyBub2RlX21vZHVsZXMgZnJvbSB0aGUgcGF0aCBhbmRcbiAgLy8gYXNzaWduIHRvIF9kaXIgZm9yIGZ1dHVyZSB1c2VcbiAgcGtnLl9kaXIgPSBwLnJlcGxhY2UoL15ub2RlX21vZHVsZXNcXC8vLCAnJyk7XG5cbiAgLy8gU3Rhc2ggdGhlIHBhY2thZ2UgZGlyZWN0b3J5IG5hbWUgZm9yIGZ1dHVyZSB1c2VcbiAgcGtnLl9uYW1lID0gcGtnLl9kaXIuc3BsaXQoJy8nKS5wb3AoKTtcblxuICAvLyBNb2R1bGUgbmFtZSBvZiB0aGUgcGFja2FnZS4gVW5saWtlIFwiX25hbWVcIiB0aGlzIHJlcHJlc2VudHMgdGhlXG4gIC8vIGZ1bGwgcGFja2FnZSBuYW1lIChpbmNsdWRpbmcgc2NvcGUgbmFtZSkuXG4gIHBrZy5fbW9kdWxlTmFtZSA9IHBrZy5uYW1lIHx8IGAke3BrZy5fZGlyfS8ke3BrZy5fbmFtZX1gO1xuXG4gIC8vIEtlZXAgdHJhY2sgb2Ygd2hldGhlciBvciBub3QgdGhpcyBpcyBhIG5lc3RlZCBwYWNrYWdlXG4gIHBrZy5faXNOZXN0ZWQgPSAvXFwvbm9kZV9tb2R1bGVzXFwvLy50ZXN0KHApO1xuXG4gIC8vIExpc3QgYWxsIHRoZSBmaWxlcyBpbiB0aGUgbnBtIHBhY2thZ2UgZm9yIGxhdGVyIHVzZVxuICBwa2cuX2ZpbGVzID0gbGlzdEZpbGVzKHApO1xuXG4gIC8vIEluaXRpYWxpemUgX2RlcGVuZGVuY2llcyB0byBhbiBlbXB0eSBhcnJheVxuICAvLyB3aGljaCBpcyBsYXRlciBmaWxsZWQgd2l0aCB0aGUgZmxhdHRlbmVkIGRlcGVuZGVuY3kgbGlzdFxuICBwa2cuX2RlcGVuZGVuY2llcyA9IFtdO1xuXG4gIC8vIEhpZGUgYmF6ZWwgZmlsZXMgaW4gdGhpcyBwYWNrYWdlLiBXZSBkbyB0aGlzIGJlZm9yZSBwYXJzaW5nXG4gIC8vIHRoZSBuZXh0IHBhY2thZ2UgdG8gcHJldmVudCBpc3N1ZXMgY2F1c2VkIGJ5IHN5bWxpbmtzIGJldHdlZW5cbiAgLy8gcGFja2FnZSBhbmQgbmVzdGVkIHBhY2thZ2VzIHNldHVwIGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXIuXG4gIGhpZGVCYXplbEZpbGVzKHBrZyk7XG5cbiAgcmV0dXJuIHBrZztcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIGJpbiBlbnRyeSBpcyBhIG5vbi1lbXB0eSBwYXRoXG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRCaW5QYXRoKGVudHJ5OiBhbnkpIHtcbiAgcmV0dXJuIGlzVmFsaWRCaW5QYXRoU3RyaW5nVmFsdWUoZW50cnkpIHx8IGlzVmFsaWRCaW5QYXRoT2JqZWN0VmFsdWVzKGVudHJ5KTtcbn1cblxuLyoqXG4gKiBJZiBnaXZlbiBhIHN0cmluZywgY2hlY2sgaWYgYSBiaW4gZW50cnkgaXMgYSBub24tZW1wdHkgcGF0aFxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQmluUGF0aFN0cmluZ1ZhbHVlKGVudHJ5OiBhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBlbnRyeSA9PT0gJ3N0cmluZycgJiYgZW50cnkgIT09ICcnO1xufVxuXG4vKipcbiAqIElmIGdpdmVuIGFuIG9iamVjdCBsaXRlcmFsLCBjaGVjayBpZiBhIGJpbiBlbnRyeSBvYmplY3RzIGhhcyBhdCBsZWFzdCBvbmUgYSBub24tZW1wdHkgcGF0aFxuICogRXhhbXBsZSAxOiB7IGVudHJ5OiAnLi9wYXRoL3RvL3NjcmlwdC5qcycgfSA9PT4gVkFMSURcbiAqIEV4YW1wbGUgMjogeyBlbnRyeTogJycgfSA9PT4gSU5WQUxJRFxuICogRXhhbXBsZSAzOiB7IGVudHJ5OiAnLi9wYXRoL3RvL3NjcmlwdC5qcycsIGVtcHR5OiAnJyB9ID09PiBWQUxJRFxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQmluUGF0aE9iamVjdFZhbHVlcyhlbnRyeTogQmFnPHN0cmluZz4pOiBib29sZWFuIHtcbiAgLy8gV2UgYWxsb3cgYXQgbGVhc3Qgb25lIHZhbGlkIGVudHJ5IHBhdGggKGlmIGFueSkuXG4gIHJldHVybiBlbnRyeSAmJiB0eXBlb2YgZW50cnkgPT09ICdvYmplY3QnICYmXG4gICAgICBPYmplY3RbJ3ZhbHVlcyddKGVudHJ5KS5maWx0ZXIoX2VudHJ5ID0+IGlzVmFsaWRCaW5QYXRoKF9lbnRyeSkpLmxlbmd0aCA+IDA7XG59XG5cbi8qKlxuICogQ2xlYW51cCBhIHBhY2thZ2UuanNvbiBcImJpblwiIHBhdGguXG4gKlxuICogQmluIHBhdGhzIHVzdWFsbHkgY29tZSBpbiAyIGZsYXZvcnM6ICcuL2Jpbi9mb28nIG9yICdiaW4vZm9vJyxcbiAqIHNvbWV0aW1lcyBvdGhlciBzdHVmZiBsaWtlICdsaWIvZm9vJy4gIFJlbW92ZSBwcmVmaXggJy4vJyBpZiBpdFxuICogZXhpc3RzLlxuICovXG5mdW5jdGlvbiBjbGVhbnVwQmluUGF0aChwOiBzdHJpbmcpIHtcbiAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAocC5pbmRleE9mKCcuLycpID09PSAwKSB7XG4gICAgcCA9IHAuc2xpY2UoMik7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG5cbi8qKlxuICogQ2xlYW51cCBhIHBhY2thZ2UuanNvbiBlbnRyeSBwb2ludCBzdWNoIGFzIFwibWFpblwiXG4gKlxuICogUmVtb3ZlcyAnLi8nIGlmIGl0IGV4aXN0cy5cbiAqIEFwcGVuZHMgYGluZGV4LmpzYCBpZiBwIGVuZHMgd2l0aCBgL2AuXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBFbnRyeVBvaW50UGF0aChwOiBzdHJpbmcpIHtcbiAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAocC5pbmRleE9mKCcuLycpID09PSAwKSB7XG4gICAgcCA9IHAuc2xpY2UoMik7XG4gIH1cbiAgaWYgKHAuZW5kc1dpdGgoJy8nKSkge1xuICAgIHAgKz0gJ2luZGV4LmpzJztcbiAgfVxuICByZXR1cm4gcDtcbn1cblxuLyoqXG4gKiBDbGVhbnMgdXAgdGhlIGdpdmVuIHBhdGhcbiAqIFRoZW4gdHJpZXMgdG8gcmVzb2x2ZSB0aGUgcGF0aCBpbnRvIGEgZmlsZSBhbmQgd2FybnMgaWYgVkVSQk9TRV9MT0dTIHNldCBhbmQgdGhlIGZpbGUgZG9zZW4ndFxuICogZXhpc3RcbiAqIEBwYXJhbSB7YW55fSBwa2dcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJucyB7c3RyaW5nIHwgdW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiBmaW5kRW50cnlGaWxlKHBrZzogRGVwLCBwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgY2xlYW5QYXRoID0gY2xlYW51cEVudHJ5UG9pbnRQYXRoKHBhdGgpO1xuICAvLyBjaGVjayBpZiBtYWluIGVudHJ5IHBvaW50IGV4aXN0c1xuICBjb25zdCBlbnRyeUZpbGUgPSBmaW5kRmlsZShwa2csIGNsZWFuUGF0aCkgfHwgZmluZEZpbGUocGtnLCBgJHtjbGVhblBhdGh9LmpzYCk7XG4gIGlmICghZW50cnlGaWxlKSB7XG4gICAgLy8gSWYgZW50cnlQb2ludCBlbnRyeSBwb2ludCBsaXN0ZWQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGEgZmlsZVxuICAgIC8vIFRoaXMgY2FuIGhhcHBlblxuICAgIC8vIGluIHNvbWUgbnBtIHBhY2thZ2VzIHRoYXQgbGlzdCBhbiBpbmNvcnJlY3QgbWFpbiBzdWNoIGFzIHY4LWNvdmVyYWdlQDEuMC44XG4gICAgLy8gd2hpY2ggbGlzdHMgYFwibWFpblwiOiBcImluZGV4LmpzXCJgIGJ1dCB0aGF0IGZpbGUgZG9lcyBub3QgZXhpc3QuXG4gICAgbG9nX3ZlcmJvc2UoXG4gICAgICAgIGBjb3VsZCBub3QgZmluZCBlbnRyeSBwb2ludCBmb3IgdGhlIHBhdGggJHtjbGVhblBhdGh9IGdpdmVuIGJ5IG5wbSBwYWNrYWdlICR7cGtnLl9uYW1lfWApO1xuICB9XG4gIHJldHVybiBlbnRyeUZpbGU7XG59XG5cbi8qKlxuICogVHJpZXMgdG8gcmVzb2x2ZSB0aGUgZW50cnlQb2ludCBmaWxlIGZyb20gdGhlIHBrZyBmb3IgYSBnaXZlbiBtYWluRmlsZU5hbWVcbiAqXG4gKiBAcGFyYW0ge2FueX0gcGtnXG4gKiBAcGFyYW0geydicm93c2VyJyB8ICdtb2R1bGUnIHwgJ21haW4nfSBtYWluRmlsZU5hbWVcbiAqIEByZXR1cm5zIHtzdHJpbmcgfCB1bmRlZmluZWR9IHRoZSBwYXRoIG9yIHVuZGVmaW5lZCBpZiB3ZSBjYW50IHJlc29sdmUgdGhlIGZpbGVcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZU1haW5GaWxlKHBrZzogRGVwLCBtYWluRmlsZU5hbWU6IHN0cmluZykge1xuICBjb25zdCBtYWluRW50cnlGaWVsZCA9IHBrZ1ttYWluRmlsZU5hbWVdO1xuXG4gIGlmIChtYWluRW50cnlGaWVsZCkge1xuICAgIGlmICh0eXBlb2YgbWFpbkVudHJ5RmllbGQgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZmluZEVudHJ5RmlsZShwa2csIG1haW5FbnRyeUZpZWxkKVxuXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWFpbkVudHJ5RmllbGQgPT09ICdvYmplY3QnICYmIG1haW5GaWxlTmFtZSA9PT0gJ2Jyb3dzZXInKSB7XG4gICAgICAvLyBicm93c2VyIGhhcyBhIHdlaXJkIHdheSBvZiBkZWZpbmluZyB0aGlzXG4gICAgICAvLyB0aGUgYnJvd3NlciB2YWx1ZSBpcyBhbiBvYmplY3QgbGlzdGluZyBmaWxlcyB0byBhbGlhcywgdXN1YWxseSBwb2ludGluZyB0byBhIGJyb3dzZXIgZGlyXG4gICAgICBjb25zdCBpbmRleEVudHJ5UG9pbnQgPSBtYWluRW50cnlGaWVsZFsnaW5kZXguanMnXSB8fCBtYWluRW50cnlGaWVsZFsnLi9pbmRleC5qcyddO1xuICAgICAgaWYgKGluZGV4RW50cnlQb2ludCkge1xuICAgICAgICByZXR1cm4gZmluZEVudHJ5RmlsZShwa2csIGluZGV4RW50cnlQb2ludClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBUcmllcyB0byByZXNvbHZlIHRoZSBtYWluRmlsZSBmcm9tIGEgZ2l2ZW4gcGtnXG4gKiBUaGlzIHVzZXMgc2V2ZWFsIG1haW5GaWxlTmFtZXMgaW4gcHJpb3JpdHkgdG8gZmluZCBhIGNvcnJlY3QgdXNhYmxlIGZpbGVcbiAqIEBwYXJhbSB7YW55fSBwa2dcbiAqIEByZXR1cm5zIHtzdHJpbmcgfCB1bmRlZmluZWR9XG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVQa2dNYWluRmlsZShwa2c6IERlcCkge1xuICAvLyBlczIwMTUgaXMgYW5vdGhlciBvcHRpb24gZm9yIG1haW5GaWxlIGhlcmVcbiAgLy8gYnV0IGl0cyB2ZXJ5IHVuY29tbW9uIGFuZCBpbSBub3Qgc3VyZSB3aGF0IHByaW9yaXR5IGl0IHRha2VzXG4gIC8vXG4gIC8vIHRoaXMgbGlzdCBpcyBvcmRlcmVkLCB3ZSB0cnkgcmVzb2x2ZSBgYnJvd3NlcmAgZmlyc3QsIHRoZW4gYG1vZHVsZWAgYW5kIGZpbmFsbHkgZmFsbCBiYWNrIHRvXG4gIC8vIGBtYWluYFxuICBjb25zdCBtYWluRmlsZU5hbWVzID0gWydicm93c2VyJywgJ21vZHVsZScsICdtYWluJ11cblxuICAgICAgZm9yIChjb25zdCBtYWluRmlsZSBvZiBtYWluRmlsZU5hbWVzKSB7XG4gICAgY29uc3QgcmVzb2x2ZWRNYWluRmlsZSA9IHJlc29sdmVNYWluRmlsZShwa2csIG1haW5GaWxlKTtcbiAgICBpZiAocmVzb2x2ZWRNYWluRmlsZSkge1xuICAgICAgcmV0dXJuIHJlc29sdmVkTWFpbkZpbGU7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgd2UgY2FudCBmaW5kIGFueSBjb3JyZWN0IGZpbGUgcmVmZXJlbmNlcyBmcm9tIHRoZSBwa2dcbiAgLy8gdGhlbiB3ZSBqdXN0IHRyeSBsb29raW5nIGFyb3VuZCBmb3IgY29tbW9uIHBhdHRlcm5zXG4gIGNvbnN0IG1heWJlUm9vdEluZGV4ID0gZmluZEVudHJ5RmlsZShwa2csICdpbmRleC5qcycpO1xuICBpZiAobWF5YmVSb290SW5kZXgpIHtcbiAgICByZXR1cm4gbWF5YmVSb290SW5kZXhcbiAgfVxuXG4gIGNvbnN0IG1heWJlU2VsZk5hbWVkSW5kZXggPSBmaW5kRW50cnlGaWxlKHBrZywgYCR7cGtnLl9uYW1lfS5qc2ApO1xuICBpZiAobWF5YmVTZWxmTmFtZWRJbmRleCkge1xuICAgIHJldHVybiBtYXliZVNlbGZOYW1lZEluZGV4O1xuICB9XG5cbiAgLy8gbm9uZSBvZiB0aGUgbWV0aG9kcyB3ZSB0cmllZCByZXN1bHRlZCBpbiBhIGZpbGVcbiAgbG9nX3ZlcmJvc2UoYGNvdWxkIG5vdCBmaW5kIGVudHJ5IHBvaW50IGZvciBucG0gcGFja2FnZSAke3BrZy5fbmFtZX1gKTtcblxuICAvLyBhdCB0aGlzIHBvaW50IHRoZXJlJ3Mgbm90aGluZyBsZWZ0IGZvciB1cyB0byB0cnksIHNvIHJldHVybiBub3RoaW5nXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbnR5cGUgQmFnPFQ+ID1cbiAgICB7XG4gICAgICBbazogc3RyaW5nXTogVFxuICAgIH1cblxuLyoqXG4gKiBGbGF0dGVucyBhbGwgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgb2YgYSBwYWNrYWdlXG4gKiBpbnRvIGEgX2RlcGVuZGVuY2llcyBhcnJheS5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlblBrZ0RlcGVuZGVuY2llcyhwa2c6IERlcCwgZGVwOiBEZXAsIHBrZ3NNYXA6IE1hcDxzdHJpbmcsIERlcD4pIHtcbiAgaWYgKHBrZy5fZGVwZW5kZW5jaWVzLmluZGV4T2YoZGVwKSAhPT0gLTEpIHtcbiAgICAvLyBjaXJjdWxhciBkZXBlbmRlbmN5XG4gICAgcmV0dXJuO1xuICB9XG4gIHBrZy5fZGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgY29uc3QgZmluZERlcHMgPSBmdW5jdGlvbih0YXJnZXREZXBzOiBCYWc8c3RyaW5nPiwgcmVxdWlyZWQ6IGJvb2xlYW4sIGRlcFR5cGU6IHN0cmluZykge1xuICAgIE9iamVjdC5rZXlzKHRhcmdldERlcHMgfHwge30pXG4gICAgICAgIC5tYXAodGFyZ2V0RGVwID0+IHtcbiAgICAgICAgICAvLyBsb29rIGZvciBtYXRjaGluZyBuZXN0ZWQgcGFja2FnZVxuICAgICAgICAgIGNvbnN0IGRpclNlZ21lbnRzID0gZGVwLl9kaXIuc3BsaXQoJy8nKTtcbiAgICAgICAgICB3aGlsZSAoZGlyU2VnbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBtYXliZSA9IHBhdGgucG9zaXguam9pbiguLi5kaXJTZWdtZW50cywgJ25vZGVfbW9kdWxlcycsIHRhcmdldERlcCk7XG4gICAgICAgICAgICBpZiAocGtnc01hcC5oYXMobWF5YmUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwa2dzTWFwLmdldChtYXliZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXJTZWdtZW50cy5wb3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gbG9vayBmb3IgbWF0Y2hpbmcgcm9vdCBwYWNrYWdlXG4gICAgICAgICAgaWYgKHBrZ3NNYXAuaGFzKHRhcmdldERlcCkpIHtcbiAgICAgICAgICAgIHJldHVybiBwa2dzTWFwLmdldCh0YXJnZXREZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBkZXBlbmRlbmN5IG5vdCBmb3VuZFxuICAgICAgICAgIGlmIChyZXF1aXJlZCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgY291bGQgbm90IGZpbmQgJHtkZXBUeXBlfSAnJHt0YXJnZXREZXB9JyBvZiAnJHtkZXAuX2Rpcn0nYCk7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKGRlcCA9PiAhIWRlcClcbiAgICAgICAgLmZvckVhY2goZGVwID0+IGZsYXR0ZW5Qa2dEZXBlbmRlbmNpZXMocGtnLCBkZXAhLCBwa2dzTWFwKSk7XG4gIH07XG4gIC8vIG5wbSB3aWxsIGluIHNvbWUgY2FzZXMgYWRkIG9wdGlvbmFsRGVwZW5kZW5jaWVzIHRvIHRoZSBsaXN0XG4gIC8vIG9mIGRlcGVuZGVuY2llcyB0byB0aGUgcGFja2FnZS5qc29uIGl0IHdyaXRlcyB0byBub2RlX21vZHVsZXMuXG4gIC8vIFdlIGRlbGV0ZSB0aGVzZSBoZXJlIGlmIHRoZXkgZXhpc3QgYXMgdGhleSBtYXkgcmVzdWx0XG4gIC8vIGluIGV4cGVjdGVkIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBub3QgZm91bmQuXG4gIGlmIChkZXAuZGVwZW5kZW5jaWVzICYmIGRlcC5vcHRpb25hbERlcGVuZGVuY2llcykge1xuICAgIE9iamVjdC5rZXlzKGRlcC5vcHRpb25hbERlcGVuZGVuY2llcykuZm9yRWFjaChvcHRpb25hbERlcCA9PiB7XG4gICAgICBkZWxldGUgZGVwLmRlcGVuZGVuY2llc1tvcHRpb25hbERlcF07XG4gICAgfSk7XG4gIH1cblxuICBmaW5kRGVwcyhkZXAuZGVwZW5kZW5jaWVzLCB0cnVlLCAnZGVwZW5kZW5jeScpO1xuICBmaW5kRGVwcyhkZXAucGVlckRlcGVuZGVuY2llcywgdHJ1ZSwgJ3BlZXIgZGVwZW5kZW5jeScpO1xuICAvLyBgb3B0aW9uYWxEZXBlbmRlbmNpZXNgIHRoYXQgYXJlIG1pc3Npbmcgc2hvdWxkIGJlIHNpbGVudGx5XG4gIC8vIGlnbm9yZWQgc2luY2UgdGhlIG5wbS95YXJuIHdpbGwgbm90IGZhaWwgaWYgdGhlc2UgZGVwZW5kZW5jaWVzXG4gIC8vIGZhaWwgdG8gaW5zdGFsbC4gUGFja2FnZXMgc2hvdWxkIGhhbmRsZSB0aGUgY2FzZXMgd2hlcmUgdGhlc2VcbiAgLy8gZGVwZW5kZW5jaWVzIGFyZSBtaXNzaW5nIGdyYWNlZnVsbHkgYXQgcnVudGltZS5cbiAgLy8gQW4gZXhhbXBsZSBvZiB0aGlzIGlzIHRoZSBgY2hva2lkYXJgIHBhY2thZ2Ugd2hpY2ggc3BlY2lmaWVzXG4gIC8vIGBmc2V2ZW50c2AgYXMgYW4gb3B0aW9uYWxEZXBlbmRlbmN5LiBPbiBPU1gsIGBmc2V2ZW50c2BcbiAgLy8gaXMgaW5zdGFsbGVkIHN1Y2Nlc3NmdWxseSwgYnV0IG9uIFdpbmRvd3MgJiBMaW51eCwgYGZzZXZlbnRzYFxuICAvLyBmYWlscyB0byBpbnN0YWxsIGFuZCB0aGUgcGFja2FnZSB3aWxsIG5vdCBiZSBwcmVzZW50IHdoZW5cbiAgLy8gY2hlY2tpbmcgdGhlIGRlcGVuZGVuY2llcyBvZiBgY2hva2lkYXJgLlxuICBmaW5kRGVwcyhkZXAub3B0aW9uYWxEZXBlbmRlbmNpZXMsIGZhbHNlLCAnb3B0aW9uYWwgZGVwZW5kZW5jeScpO1xufVxuXG4vKipcbiAqIFJlZm9ybWF0L3ByZXR0eS1wcmludCBhIGpzb24gb2JqZWN0IGFzIGEgc2t5bGFyayBjb21tZW50IChlYWNoIGxpbmVcbiAqIHN0YXJ0cyB3aXRoICcjICcpLlxuICovXG5mdW5jdGlvbiBwcmludEpzb24ocGtnOiBEZXApIHtcbiAgLy8gQ2xvbmUgYW5kIG1vZGlmeSBfZGVwZW5kZW5jaWVzIHRvIGF2b2lkIGNpcmN1bGFyIGlzc3VlcyB3aGVuIEpTT05pZnlpbmdcbiAgLy8gJiBkZWxldGUgX2ZpbGVzIGFycmF5XG4gIGNvbnN0IGNsb25lZDogYW55ID0gey4uLnBrZ307XG4gIGNsb25lZC5fZGVwZW5kZW5jaWVzID0gcGtnLl9kZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBkZXAuX2Rpcik7XG4gIGRlbGV0ZSBjbG9uZWQuX2ZpbGVzO1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY2xvbmVkLCBudWxsLCAyKS5zcGxpdCgnXFxuJykubWFwKGxpbmUgPT4gYCMgJHtsaW5lfWApLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIEEgZmlsdGVyIGZ1bmN0aW9uIGZvciBmaWxlcyBpbiBhbiBucG0gcGFja2FnZS4gQ29tcGFyaXNvbiBpcyBjYXNlLWluc2Vuc2l0aXZlLlxuICogQHBhcmFtIGZpbGVzIGFycmF5IG9mIGZpbGVzIHRvIGZpbHRlclxuICogQHBhcmFtIGV4dHMgbGlzdCBvZiB3aGl0ZSBsaXN0ZWQgY2FzZS1pbnNlbnNpdGl2ZSBleHRlbnNpb25zOyBpZiBlbXB0eSwgbm8gZmlsdGVyIGlzXG4gKiAgICAgICAgICAgICBkb25lIG9uIGV4dGVuc2lvbnM7ICcnIGVtcHR5IHN0cmluZyBkZW5vdGVzIHRvIGFsbG93IGZpbGVzIHdpdGggbm8gZXh0ZW5zaW9ucyxcbiAqICAgICAgICAgICAgIG90aGVyIGV4dGVuc2lvbnMgYXJlIGxpc3RlZCB3aXRoICcuZXh0JyBub3RhdGlvbiBzdWNoIGFzICcuZC50cycuXG4gKi9cbmZ1bmN0aW9uIGZpbHRlckZpbGVzKGZpbGVzOiBzdHJpbmdbXSwgZXh0czogc3RyaW5nW10gPSBbXSkge1xuICBpZiAoZXh0cy5sZW5ndGgpIHtcbiAgICBjb25zdCBhbGxvd05vRXh0cyA9IGV4dHMuaW5jbHVkZXMoJycpO1xuICAgIGZpbGVzID0gZmlsZXMuZmlsdGVyKGYgPT4ge1xuICAgICAgLy8gaW5jbHVkZSBmaWxlcyB3aXRoIG5vIGV4dGVuc2lvbnMgaWYgbm9FeHQgaXMgdHJ1ZVxuICAgICAgaWYgKGFsbG93Tm9FeHRzICYmICFwYXRoLmV4dG5hbWUoZikpIHJldHVybiB0cnVlO1xuICAgICAgLy8gZmlsdGVyIGZpbGVzIGluIGV4dHNcbiAgICAgIGNvbnN0IGxjID0gZi50b0xvd2VyQ2FzZSgpO1xuICAgICAgZm9yIChjb25zdCBlIG9mIGV4dHMpIHtcbiAgICAgICAgaWYgKGUgJiYgbGMuZW5kc1dpdGgoZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSlcbiAgfVxuICAvLyBGaWx0ZXIgb3V0IEJVSUxEIGZpbGVzIHRoYXQgY2FtZSB3aXRoIHRoZSBucG0gcGFja2FnZVxuICByZXR1cm4gZmlsZXMuZmlsdGVyKGZpbGUgPT4ge1xuICAgIGNvbnN0IGJhc2VuYW1lVWMgPSBwYXRoLmJhc2VuYW1lKGZpbGUpLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKGJhc2VuYW1lVWMgPT09ICdfQlVJTEQnIHx8IGJhc2VuYW1lVWMgPT09ICdfQlVJTEQuQkFaRUwnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIHNwZWNpZmllZCBgcGtnYCBjb25mb3JtcyB0byBBbmd1bGFyIFBhY2thZ2UgRm9ybWF0IChBUEYpLFxuICogZmFsc2Ugb3RoZXJ3aXNlLiBJZiB0aGUgcGFja2FnZSBjb250YWlucyBgKi5tZXRhZGF0YS5qc29uYCBhbmQgYVxuICogY29ycmVzcG9uZGluZyBzaWJsaW5nIGAuZC50c2AgZmlsZSwgdGhlbiB0aGUgcGFja2FnZSBpcyBjb25zaWRlcmVkIHRvIGJlIEFQRi5cbiAqL1xuZnVuY3Rpb24gaXNOZ0FwZlBhY2thZ2UocGtnOiBEZXApIHtcbiAgY29uc3Qgc2V0ID0gbmV3IFNldChwa2cuX2ZpbGVzKTtcbiAgaWYgKHNldC5oYXMoJ0FOR1VMQVJfUEFDS0FHRScpKSB7XG4gICAgLy8gVGhpcyBmaWxlIGlzIHVzZWQgYnkgdGhlIG5wbS95YXJuX2luc3RhbGwgcnVsZSB0byBkZXRlY3QgQVBGLiBTZWVcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzkyN1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGNvbnN0IG1ldGFkYXRhRXh0ID0gL1xcLm1ldGFkYXRhXFwuanNvbiQvO1xuICByZXR1cm4gcGtnLl9maWxlcy5zb21lKChmaWxlKSA9PiB7XG4gICAgaWYgKG1ldGFkYXRhRXh0LnRlc3QoZmlsZSkpIHtcbiAgICAgIGNvbnN0IHNpYmxpbmcgPSBmaWxlLnJlcGxhY2UobWV0YWRhdGFFeHQsICcuZC50cycpO1xuICAgICAgaWYgKHNldC5oYXMoc2libGluZykpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59XG5cbi8qKlxuICogSWYgdGhlIHBhY2thZ2UgaXMgaW4gdGhlIEFuZ3VsYXIgcGFja2FnZSBmb3JtYXQgcmV0dXJucyBsaXN0XG4gKiBvZiBwYWNrYWdlIGZpbGVzIHRoYXQgZW5kIHdpdGggYC51bWQuanNgLCBgLm5nZmFjdG9yeS5qc2AgYW5kIGAubmdzdW1tYXJ5LmpzYC5cbiAqL1xuZnVuY3Rpb24gZ2V0TmdBcGZTY3JpcHRzKHBrZzogRGVwKSB7XG4gIHJldHVybiBpc05nQXBmUGFja2FnZShwa2cpID9cbiAgICAgIGZpbHRlckZpbGVzKHBrZy5fZmlsZXMsIFsnLnVtZC5qcycsICcubmdmYWN0b3J5LmpzJywgJy5uZ3N1bW1hcnkuanMnXSkgOlxuICAgICAgW107XG59XG5cbi8qKlxuICogTG9va3MgZm9yIGEgZmlsZSB3aXRoaW4gYSBwYWNrYWdlIGFuZCByZXR1cm5zIGl0IGlmIGZvdW5kLlxuICovXG5mdW5jdGlvbiBmaW5kRmlsZShwa2c6IERlcCwgbTogc3RyaW5nKSB7XG4gIGNvbnN0IG1sID0gbS50b0xvd2VyQ2FzZSgpO1xuICBmb3IgKGNvbnN0IGYgb2YgcGtnLl9maWxlcykge1xuICAgIGlmIChmLnRvTG93ZXJDYXNlKCkgPT09IG1sKSB7XG4gICAgICByZXR1cm4gZjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBHaXZlbiBhIHBrZywgcmV0dXJuIHRoZSBza3lsYXJrIGBub2RlX21vZHVsZV9saWJyYXJ5YCB0YXJnZXRzIGZvciB0aGUgcGFja2FnZS5cbiAqL1xuZnVuY3Rpb24gcHJpbnRQYWNrYWdlKHBrZzogRGVwKSB7XG4gIGNvbnN0IHNvdXJjZXMgPSBmaWx0ZXJGaWxlcyhwa2cuX2ZpbGVzLCBJTkNMVURFRF9GSUxFUyk7XG4gIGNvbnN0IGR0c1NvdXJjZXMgPSBmaWx0ZXJGaWxlcyhwa2cuX2ZpbGVzLCBbJy5kLnRzJ10pO1xuICAvLyBUT0RPKGdtYWdvbGFuKTogYWRkIFVNRCAmIEFNRCBzY3JpcHRzIHRvIHNjcmlwdHMgZXZlbiBpZiBub3QgYW4gQVBGIHBhY2thZ2UgX2J1dF8gb25seSBpZiB0aGV5XG4gIC8vIGFyZSBuYW1lZD9cbiAgY29uc3Qgc2NyaXB0cyA9IGdldE5nQXBmU2NyaXB0cyhwa2cpO1xuICBjb25zdCBkZXBzID0gW3BrZ10uY29uY2F0KHBrZy5fZGVwZW5kZW5jaWVzLmZpbHRlcihkZXAgPT4gZGVwICE9PSBwa2cgJiYgIWRlcC5faXNOZXN0ZWQpKTtcblxuICBsZXQgc2NyaXB0U3RhcmxhcmsgPSAnJztcbiAgaWYgKHNjcmlwdHMubGVuZ3RoKSB7XG4gICAgc2NyaXB0U3RhcmxhcmsgPSBgXG4gICAgIyBzdWJzZXQgb2Ygc3JjcyB0aGF0IGFyZSBqYXZhc2NyaXB0IG5hbWVkLVVNRCBvciBuYW1lZC1BTUQgc2NyaXB0c1xuICAgIHNjcmlwdHMgPSBbXG4gICAgICAgICR7c2NyaXB0cy5tYXAoKGY6IHN0cmluZykgPT4gYFwiLy86bm9kZV9tb2R1bGVzLyR7cGtnLl9kaXJ9LyR7Zn1cIixgKS5qb2luKCdcXG4gICAgICAgICcpfVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBzcmNzU3RhcmxhcmsgPSAnJztcbiAgaWYgKHNvdXJjZXMubGVuZ3RoKSB7XG4gICAgc3Jjc1N0YXJsYXJrID0gYFxuICAgICMgJHtwa2cuX2Rpcn0gcGFja2FnZSBmaWxlcyAoYW5kIGZpbGVzIGluIG5lc3RlZCBub2RlX21vZHVsZXMpXG4gICAgc3JjcyA9IFtcbiAgICAgICAgJHtzb3VyY2VzLm1hcCgoZjogc3RyaW5nKSA9PiBgXCIvLzpub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtmfVwiLGApLmpvaW4oJ1xcbiAgICAgICAgJyl9XG4gICAgXSxgO1xuICB9XG5cbiAgbGV0IGRlcHNTdGFybGFyayA9ICcnO1xuICBpZiAoZGVwcy5sZW5ndGgpIHtcbiAgICBjb25zdCBsaXN0ID0gZGVwcy5tYXAoZGVwID0+IGBcIi8vJHtkZXAuX2Rpcn06JHtkZXAuX25hbWV9X19jb250ZW50c1wiLGApLmpvaW4oJ1xcbiAgICAgICAgJyk7XG4gICAgZGVwc1N0YXJsYXJrID0gYFxuICAgICMgZmxhdHRlbmVkIGxpc3Qgb2YgZGlyZWN0IGFuZCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcyBob2lzdGVkIHRvIHJvb3QgYnkgdGhlIHBhY2thZ2UgbWFuYWdlclxuICAgIGRlcHMgPSBbXG4gICAgICAgICR7bGlzdH1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgZHRzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGR0c1NvdXJjZXMubGVuZ3RoKSB7XG4gICAgZHRzU3RhcmxhcmsgPSBgXG4gICAgIyAke3BrZy5fZGlyfSBwYWNrYWdlIGRlY2xhcmF0aW9uIGZpbGVzIChhbmQgZGVjbGFyYXRpb24gZmlsZXMgaW4gbmVzdGVkIG5vZGVfbW9kdWxlcylcbiAgICBzcmNzID0gW1xuICAgICAgICAke2R0c1NvdXJjZXMubWFwKGYgPT4gYFwiLy86bm9kZV9tb2R1bGVzLyR7cGtnLl9kaXJ9LyR7Zn1cIixgKS5qb2luKCdcXG4gICAgICAgICcpfVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCByZXN1bHQgPVxuICAgICAgYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy9pbnRlcm5hbC9ucG1faW5zdGFsbDpub2RlX21vZHVsZV9saWJyYXJ5LmJ6bFwiLCBcIm5vZGVfbW9kdWxlX2xpYnJhcnlcIilcblxuIyBHZW5lcmF0ZWQgdGFyZ2V0cyBmb3IgbnBtIHBhY2thZ2UgXCIke3BrZy5fZGlyfVwiXG4ke3ByaW50SnNvbihwa2cpfVxuXG5maWxlZ3JvdXAoXG4gICAgbmFtZSA9IFwiJHtwa2cuX25hbWV9X19maWxlc1wiLCR7c3Jjc1N0YXJsYXJrfVxuKVxuXG5ub2RlX21vZHVsZV9saWJyYXJ5KFxuICAgIG5hbWUgPSBcIiR7cGtnLl9uYW1lfVwiLFxuICAgICMgZGlyZWN0IHNvdXJjZXMgbGlzdGVkIGZvciBzdHJpY3QgZGVwcyBzdXBwb3J0XG4gICAgc3JjcyA9IFtcIjoke3BrZy5fbmFtZX1fX2ZpbGVzXCJdLCR7ZGVwc1N0YXJsYXJrfVxuKVxuXG4jICR7cGtnLl9uYW1lfV9fY29udGVudHMgdGFyZ2V0IGlzIHVzZWQgYXMgZGVwIGZvciBtYWluIHRhcmdldHMgdG8gcHJldmVudFxuIyBjaXJjdWxhciBkZXBlbmRlbmNpZXMgZXJyb3JzXG5ub2RlX21vZHVsZV9saWJyYXJ5KFxuICAgIG5hbWUgPSBcIiR7cGtnLl9uYW1lfV9fY29udGVudHNcIixcbiAgICBzcmNzID0gW1wiOiR7cGtnLl9uYW1lfV9fZmlsZXNcIl0sJHtzY3JpcHRTdGFybGFya31cbilcblxuIyAke3BrZy5fbmFtZX1fX3R5cGluZ3MgaXMgdGhlIHN1YnNldCBvZiAke3BrZy5fbmFtZX1fX2NvbnRlbnRzIHRoYXQgYXJlIGRlY2xhcmF0aW9uc1xubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1fX3R5cGluZ3NcIiwke2R0c1N0YXJsYXJrfVxuKVxuXG5gO1xuXG4gIGxldCBtYWluRW50cnlQb2ludCA9IHJlc29sdmVQa2dNYWluRmlsZShwa2cpXG5cbiAgLy8gYWRkIGFuIGBucG1fdW1kX2J1bmRsZWAgdGFyZ2V0IHRvIGdlbmVyYXRlIGFuIFVNRCBidW5kbGUgaWYgb25lIGRvZXNcbiAgLy8gbm90IGV4aXN0c1xuICBpZiAobWFpbkVudHJ5UG9pbnQgJiYgIWZpbmRGaWxlKHBrZywgYCR7cGtnLl9uYW1lfS51bWQuanNgKSkge1xuICAgIHJlc3VsdCArPVxuICAgICAgICBgbG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvL2ludGVybmFsL25wbV9pbnN0YWxsOm5wbV91bWRfYnVuZGxlLmJ6bFwiLCBcIm5wbV91bWRfYnVuZGxlXCIpXG5cbm5wbV91bWRfYnVuZGxlKFxuICAgIG5hbWUgPSBcIiR7cGtnLl9uYW1lfV9fdW1kXCIsXG4gICAgcGFja2FnZV9uYW1lID0gXCIke3BrZy5fbmFtZX1cIixcbiAgICBlbnRyeV9wb2ludCA9IFwiLy86bm9kZV9tb2R1bGVzLyR7cGtnLl9kaXJ9LyR7bWFpbkVudHJ5UG9pbnR9XCIsXG4gICAgcGFja2FnZSA9IFwiOiR7cGtnLl9uYW1lfVwiLFxuKVxuXG5gO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gX2ZpbmRFeGVjdXRhYmxlcyhwa2c6IERlcCkge1xuICBjb25zdCBleGVjdXRhYmxlcyA9IG5ldyBNYXAoKTtcblxuICAvLyBGb3Igcm9vdCBwYWNrYWdlcywgdHJhbnNmb3JtIHRoZSBwa2cuYmluIGVudHJpZXNcbiAgLy8gaW50byBhIG5ldyBNYXAgY2FsbGVkIF9leGVjdXRhYmxlc1xuICAvLyBOT1RFOiB3ZSBkbyB0aGlzIG9ubHkgZm9yIG5vbi1lbXB0eSBiaW4gcGF0aHNcbiAgaWYgKGlzVmFsaWRCaW5QYXRoKHBrZy5iaW4pKSB7XG4gICAgaWYgKCFwa2cuX2lzTmVzdGVkKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwa2cuYmluKSkge1xuICAgICAgICBpZiAocGtnLmJpbi5sZW5ndGggPT0gMSkge1xuICAgICAgICAgIGV4ZWN1dGFibGVzLnNldChwa2cuX2RpciwgY2xlYW51cEJpblBhdGgocGtnLmJpblswXSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHNob3VsZCBub3QgaGFwcGVuLCBidXQgaWdub3JlIGl0IGlmIHByZXNlbnRcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGtnLmJpbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgZXhlY3V0YWJsZXMuc2V0KHBrZy5fZGlyLCBjbGVhbnVwQmluUGF0aChwa2cuYmluKSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwa2cuYmluID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gcGtnLmJpbikge1xuICAgICAgICAgIGlmIChpc1ZhbGlkQmluUGF0aFN0cmluZ1ZhbHVlKHBrZy5iaW5ba2V5XSkpIHtcbiAgICAgICAgICAgIGV4ZWN1dGFibGVzLnNldChrZXksIGNsZWFudXBCaW5QYXRoKHBrZy5iaW5ba2V5XSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBleGVjdXRhYmxlcztcbn1cblxuLy8gSGFuZGxlIGFkZGl0aW9uYWxBdHRyaWJ1dGVzIG9mIGZvcm1hdDpcbi8vIGBgYFxuLy8gXCJiYXplbEJpblwiOiB7XG4vLyAgIFwibmdjLXdyYXBwZWRcIjoge1xuLy8gICAgIFwiYWRkaXRpb25hbEF0dHJpYnV0ZXNcIjoge1xuLy8gICAgICAgXCJjb25maWd1cmF0aW9uX2Vudl92YXJzXCI6IFwiW1xcXCJjb21waWxlXFxcIl1cIlxuLy8gICB9XG4vLyB9LFxuLy8gYGBgXG5mdW5jdGlvbiBhZGRpdGlvbmFsQXR0cmlidXRlcyhwa2c6IERlcCwgbmFtZTogc3RyaW5nKSB7XG4gIGxldCBhZGRpdGlvbmFsQXR0cmlidXRlcyA9ICcnO1xuICBpZiAocGtnLmJhemVsQmluICYmIHBrZy5iYXplbEJpbltuYW1lXSAmJiBwa2cuYmF6ZWxCaW5bbmFtZV0uYWRkaXRpb25hbEF0dHJpYnV0ZXMpIHtcbiAgICBjb25zdCBhdHRycyA9IHBrZy5iYXplbEJpbltuYW1lXS5hZGRpdGlvbmFsQXR0cmlidXRlcztcbiAgICBmb3IgKGNvbnN0IGF0dHJOYW1lIG9mIE9iamVjdC5rZXlzKGF0dHJzKSkge1xuICAgICAgY29uc3QgYXR0clZhbHVlID0gYXR0cnNbYXR0ck5hbWVdO1xuICAgICAgYWRkaXRpb25hbEF0dHJpYnV0ZXMgKz0gYFxcbiAgICAke2F0dHJOYW1lfSA9ICR7YXR0clZhbHVlfSxgO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWRkaXRpb25hbEF0dHJpYnV0ZXM7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBwa2csIHJldHVybiB0aGUgc2t5bGFyayBub2RlanNfYmluYXJ5IHRhcmdldHMgZm9yIHRoZSBwYWNrYWdlLlxuICovXG5mdW5jdGlvbiBwcmludFBhY2thZ2VCaW4ocGtnOiBEZXApIHtcbiAgbGV0IHJlc3VsdCA9ICcnO1xuICBjb25zdCBleGVjdXRhYmxlcyA9IF9maW5kRXhlY3V0YWJsZXMocGtnKTtcbiAgaWYgKGV4ZWN1dGFibGVzLnNpemUpIHtcbiAgICByZXN1bHQgPSBgbG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvLzppbmRleC5iemxcIiwgXCJub2RlanNfYmluYXJ5XCIpXG5cbmA7XG4gICAgY29uc3QgZGF0YSA9IFtgLy8ke3BrZy5fZGlyfToke3BrZy5fbmFtZX1gXTtcbiAgICBpZiAocGtnLl9keW5hbWljRGVwZW5kZW5jaWVzKSB7XG4gICAgICBkYXRhLnB1c2goLi4ucGtnLl9keW5hbWljRGVwZW5kZW5jaWVzKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBwYXRoXSBvZiBleGVjdXRhYmxlcy5lbnRyaWVzKCkpIHtcbiAgICAgIHJlc3VsdCArPSBgIyBXaXJlIHVwIHRoZSBcXGBiaW5cXGAgZW50cnkgXFxgJHtuYW1lfVxcYFxubm9kZWpzX2JpbmFyeShcbiAgICBuYW1lID0gXCIke25hbWV9XCIsXG4gICAgZW50cnlfcG9pbnQgPSBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke3BhdGh9XCIsXG4gICAgaW5zdGFsbF9zb3VyY2VfbWFwX3N1cHBvcnQgPSBGYWxzZSxcbiAgICBkYXRhID0gWyR7ZGF0YS5tYXAocCA9PiBgXCIke3B9XCJgKS5qb2luKCcsICcpfV0sJHthZGRpdGlvbmFsQXR0cmlidXRlcyhwa2csIG5hbWUpfVxuKVxuXG5gO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHByaW50SW5kZXhCemwocGtnOiBEZXApIHtcbiAgbGV0IHJlc3VsdCA9ICcnO1xuICBjb25zdCBleGVjdXRhYmxlcyA9IF9maW5kRXhlY3V0YWJsZXMocGtnKTtcbiAgaWYgKGV4ZWN1dGFibGVzLnNpemUpIHtcbiAgICByZXN1bHQgPSBgbG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvLzppbmRleC5iemxcIiwgXCJub2RlanNfYmluYXJ5XCIsIFwibnBtX3BhY2thZ2VfYmluXCIpXG5cbmA7XG4gICAgY29uc3QgZGF0YSA9IFtgQCR7V09SS1NQQUNFfS8vJHtwa2cuX2Rpcn06JHtwa2cuX25hbWV9YF07XG4gICAgaWYgKHBrZy5fZHluYW1pY0RlcGVuZGVuY2llcykge1xuICAgICAgZGF0YS5wdXNoKC4uLnBrZy5fZHluYW1pY0RlcGVuZGVuY2llcyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgcGF0aF0gb2YgZXhlY3V0YWJsZXMuZW50cmllcygpKSB7XG4gICAgICByZXN1bHQgPSBgJHtyZXN1bHR9XG5cbiMgR2VuZXJhdGVkIGhlbHBlciBtYWNybyB0byBjYWxsICR7bmFtZX1cbmRlZiAke25hbWUucmVwbGFjZSgvLS9nLCAnXycpfSgqKmt3YXJncyk6XG4gICAgb3V0cHV0X2RpciA9IGt3YXJncy5wb3AoXCJvdXRwdXRfZGlyXCIsIEZhbHNlKVxuICAgIGlmIFwib3V0c1wiIGluIGt3YXJncyBvciBvdXRwdXRfZGlyOlxuICAgICAgICBucG1fcGFja2FnZV9iaW4odG9vbCA9IFwiQCR7V09SS1NQQUNFfS8vJHtwa2cuX2Rpcn0vYmluOiR7XG4gICAgICAgICAgbmFtZX1cIiwgb3V0cHV0X2RpciA9IG91dHB1dF9kaXIsICoqa3dhcmdzKVxuICAgIGVsc2U6XG4gICAgICAgIG5vZGVqc19iaW5hcnkoXG4gICAgICAgICAgICBlbnRyeV9wb2ludCA9IFwiQCR7V09SS1NQQUNFfS8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke3BhdGh9XCIsXG4gICAgICAgICAgICBpbnN0YWxsX3NvdXJjZV9tYXBfc3VwcG9ydCA9IEZhbHNlLFxuICAgICAgICAgICAgZGF0YSA9IFske2RhdGEubWFwKHAgPT4gYFwiJHtwfVwiYCkuam9pbignLCAnKX1dICsga3dhcmdzLnBvcChcImRhdGFcIiwgW10pLCR7XG4gICAgICAgICAgYWRkaXRpb25hbEF0dHJpYnV0ZXMocGtnLCBuYW1lKX1cbiAgICAgICAgICAgICoqa3dhcmdzXG4gICAgICAgIClcbiAgYDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxudHlwZSBEZXAgPSB7XG4gIF9kaXI6IHN0cmluZyxcbiAgX2lzTmVzdGVkOiBib29sZWFuLFxuICBfZGVwZW5kZW5jaWVzOiBEZXBbXSxcbiAgX2ZpbGVzOiBzdHJpbmdbXSxcbiAgW2s6IHN0cmluZ106IGFueVxufVxuXG4vKipcbiAqIEdpdmVuIGEgc2NvcGUsIHJldHVybiB0aGUgc2t5bGFyayBgbm9kZV9tb2R1bGVfbGlicmFyeWAgdGFyZ2V0IGZvciB0aGUgc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHByaW50U2NvcGUoc2NvcGU6IHN0cmluZywgcGtnczogRGVwW10pIHtcbiAgcGtncyA9IHBrZ3MuZmlsdGVyKHBrZyA9PiAhcGtnLl9pc05lc3RlZCAmJiBwa2cuX2Rpci5zdGFydHNXaXRoKGAke3Njb3BlfS9gKSk7XG4gIGxldCBkZXBzOiBEZXBbXSA9IFtdO1xuICBwa2dzLmZvckVhY2gocGtnID0+IHtcbiAgICBkZXBzID0gZGVwcy5jb25jYXQocGtnLl9kZXBlbmRlbmNpZXMuZmlsdGVyKGRlcCA9PiAhZGVwLl9pc05lc3RlZCAmJiAhcGtncy5pbmNsdWRlcyhwa2cpKSk7XG4gIH0pO1xuICAvLyBmaWx0ZXIgb3V0IGR1cGxpY2F0ZSBkZXBzXG4gIGRlcHMgPSBbLi4ucGtncywgLi4ubmV3IFNldChkZXBzKV07XG5cbiAgbGV0IHNyY3NTdGFybGFyayA9ICcnO1xuICBpZiAoZGVwcy5sZW5ndGgpIHtcbiAgICBjb25zdCBsaXN0ID0gZGVwcy5tYXAoZGVwID0+IGBcIi8vJHtkZXAuX2Rpcn06JHtkZXAuX25hbWV9X19maWxlc1wiLGApLmpvaW4oJ1xcbiAgICAgICAgJyk7XG4gICAgc3Jjc1N0YXJsYXJrID0gYFxuICAgICMgZGlyZWN0IHNvdXJjZXMgbGlzdGVkIGZvciBzdHJpY3QgZGVwcyBzdXBwb3J0XG4gICAgc3JjcyA9IFtcbiAgICAgICAgJHtsaXN0fVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBkZXBzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGRlcHMubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IGRlcHMubWFwKGRlcCA9PiBgXCIvLyR7ZGVwLl9kaXJ9OiR7ZGVwLl9uYW1lfV9fY29udGVudHNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIGRlcHNTdGFybGFyayA9IGBcbiAgICAjIGZsYXR0ZW5lZCBsaXN0IG9mIGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgaG9pc3RlZCB0byByb290IGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXJcbiAgICBkZXBzID0gW1xuICAgICAgICAke2xpc3R9XG4gICAgXSxgO1xuICB9XG5cbiAgcmV0dXJuIGBsb2FkKFwiQGJ1aWxkX2JhemVsX3J1bGVzX25vZGVqcy8vaW50ZXJuYWwvbnBtX2luc3RhbGw6bm9kZV9tb2R1bGVfbGlicmFyeS5iemxcIiwgXCJub2RlX21vZHVsZV9saWJyYXJ5XCIpXG5cbiMgR2VuZXJhdGVkIHRhcmdldCBmb3IgbnBtIHNjb3BlICR7c2NvcGV9XG5ub2RlX21vZHVsZV9saWJyYXJ5KFxuICAgIG5hbWUgPSBcIiR7c2NvcGV9XCIsJHtzcmNzU3Rhcmxhcmt9JHtkZXBzU3Rhcmxhcmt9XG4pXG5cbmA7XG59XG4iXX0=