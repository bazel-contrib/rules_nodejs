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
    const PEER_DEPS_HANDLING = args[6] || 'strict';
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
    function flattenPkgDependencies(pkg, dep, pkgsMap, peerDepsHandling = PEER_DEPS_HANDLING) {
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
                .forEach(dep => flattenPkgDependencies(pkg, dep, pkgsMap, peerDepsHandling));
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
        findDeps(dep.peerDependencies, peerDepsHandling === 'ignore' ? false : true, 'peer dependency');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVfYnVpbGRfZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL25wbV9pbnN0YWxsL2dlbmVyYXRlX2J1aWxkX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0lBQUE7Ozs7Ozs7Ozs7Ozs7OztPQWVHO0lBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDSCxZQUFZLENBQUM7O0lBR2IseUJBQXlCO0lBQ3pCLDZCQUE2QjtJQUU3QixTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVE7UUFDOUIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUM7WUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckYsQ0FBQztJQUVELE1BQU0saUJBQWlCLEdBQUc7Ozs7OztDQU16QixDQUFBO0lBRUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDekQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxD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QUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0YsQ0FBQyxDQUFDLENBQUM7UUFDSCw0QkFBNEI7UUFDNUIsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRW5DLElBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN0QixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4RixZQUFZLEdBQUc7OztVQUdULElBQUk7T0FDUCxDQUFDO1NBQ0w7UUFFRCxJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDM0YsWUFBWSxHQUFHOzs7VUFHVCxJQUFJO09BQ1AsQ0FBQztTQUNMO1FBRUQsT0FBTzs7bUNBRTBCLEtBQUs7O2NBRTFCLEtBQUssS0FBSyxZQUFZLEdBQUcsWUFBWTs7O0NBR2xELENBQUM7SUFDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgVGhlIEJhemVsIEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgVGhpcyBzY3JpcHQgZ2VuZXJhdGVzIEJVSUxELmJhemVsIGZpbGVzIGJ5IGFuYWx5emluZ1xuICogdGhlIG5vZGVfbW9kdWxlcyBmb2xkZXIgbGF5ZWQgb3V0IGJ5IHlhcm4gb3IgbnBtLiBJdCBnZW5lcmF0ZXNcbiAqIGZpbmUgZ3JhaW5lZCBCYXplbCBgbm9kZV9tb2R1bGVfbGlicmFyeWAgdGFyZ2V0cyBmb3IgZWFjaCByb290IG5wbSBwYWNrYWdlXG4gKiBhbmQgYWxsIGZpbGVzIGZvciB0aGF0IHBhY2thZ2UgYW5kIGl0cyB0cmFuc2l0aXZlIGRlcHMgYXJlIGluY2x1ZGVkXG4gKiBpbiB0aGUgdGFyZ2V0LiBGb3IgZXhhbXBsZSwgYEA8d29ya3NwYWNlPi8vamFzbWluZWAgd291bGRcbiAqIGluY2x1ZGUgYWxsIGZpbGVzIGluIHRoZSBqYXNtaW5lIG5wbSBwYWNrYWdlIGFuZCBhbGwgb2YgaXRzXG4gKiB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcy5cbiAqXG4gKiBub2RlanNfYmluYXJ5IHRhcmdldHMgYXJlIGFsc28gZ2VuZXJhdGVkIGZvciBhbGwgYGJpbmAgc2NyaXB0c1xuICogaW4gZWFjaCBwYWNrYWdlLiBGb3IgZXhhbXBsZSwgdGhlIGBAPHdvcmtzcGFjZT4vL2phc21pbmUvYmluOmphc21pbmVgXG4gKiB0YXJnZXQgd2lsbCBiZSBnZW5lcmF0ZWQgZm9yIHRoZSBgamFzbWluZWAgYmluYXJ5IGluIHRoZSBgamFzbWluZWBcbiAqIG5wbSBwYWNrYWdlLlxuICpcbiAqIEFkZGl0aW9uYWxseSwgYSBgQDx3b3Jrc3BhY2U+Ly86bm9kZV9tb2R1bGVzYCBgbm9kZV9tb2R1bGVfbGlicmFyeWBcbiAqIGlzIGdlbmVyYXRlZCB0aGF0IGluY2x1ZGVzIGFsbCBwYWNrYWdlcyB1bmRlciBub2RlX21vZHVsZXNcbiAqIGFzIHdlbGwgYXMgdGhlIC5iaW4gZm9sZGVyLlxuICpcbiAqIFRoaXMgd29yayBpcyBiYXNlZCBvZmYgdGhlIGZpbmUgZ3JhaW5lZCBkZXBzIGNvbmNlcHRzIGluXG4gKiBodHRwczovL2dpdGh1Yi5jb20vcHVicmVmL3J1bGVzX25vZGUgZGV2ZWxvcGVkIGJ5IEBwY2ouXG4gKlxuICogQHNlZSBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzFBZmpITUxWeUVfdll3bEhTSzdrN3lXX0lJR3BwU3hzUXRQbTlQVHIxeEVvXG4gKi9cbid1c2Ugc3RyaWN0JztcblxuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5mdW5jdGlvbiBsb2dfdmVyYm9zZSguLi5tOiBhbnlbXSkge1xuICBpZiAoISFwcm9jZXNzLmVudlsnVkVSQk9TRV9MT0dTJ10pIGNvbnNvbGUuZXJyb3IoJ1tnZW5lcmF0ZV9idWlsZF9maWxlLmpzXScsIC4uLm0pO1xufVxuXG5jb25zdCBCVUlMRF9GSUxFX0hFQURFUiA9IGAjIEdlbmVyYXRlZCBmaWxlIGZyb20geWFybl9pbnN0YWxsL25wbV9pbnN0YWxsIHJ1bGUuXG4jIFNlZSAkKGJhemVsIGluZm8gb3V0cHV0X2Jhc2UpL2V4dGVybmFsL2J1aWxkX2JhemVsX3J1bGVzX25vZGVqcy9pbnRlcm5hbC9ucG1faW5zdGFsbC9nZW5lcmF0ZV9idWlsZF9maWxlLmpzXG5cbiMgQWxsIHJ1bGVzIGluIG90aGVyIHJlcG9zaXRvcmllcyBjYW4gdXNlIHRoZXNlIHRhcmdldHNcbnBhY2thZ2UoZGVmYXVsdF92aXNpYmlsaXR5ID0gW1wiLy92aXNpYmlsaXR5OnB1YmxpY1wiXSlcblxuYFxuXG5jb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuY29uc3QgV09SS1NQQUNFID0gYXJnc1swXTtcbmNvbnN0IFJVTEVfVFlQRSA9IGFyZ3NbMV07XG5jb25zdCBFUlJPUl9PTl9CQVpFTF9GSUxFUyA9IHBhcnNlSW50KGFyZ3NbMl0pO1xuY29uc3QgTE9DS19GSUxFX0xBQkVMID0gYXJnc1szXTtcbmNvbnN0IElOQ0xVREVEX0ZJTEVTID0gYXJnc1s0XSA/IGFyZ3NbNF0uc3BsaXQoJywnKSA6IFtdO1xuY29uc3QgRFlOQU1JQ19ERVBTID0gSlNPTi5wYXJzZShhcmdzWzVdIHx8ICd7fScpO1xuY29uc3QgUEVFUl9ERVBTX0hBTkRMSU5HID0gYXJnc1s2XSB8fCAnc3RyaWN0JztcblxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIG1haW4oKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgZGlyZWN0b3J5IGFuZCBhbnkgbmVjZXNzYXJ5IHN1YmRpcmVjdG9yaWVzXG4gKiBpZiB0aGV5IGRvIG5vdCBleGlzdC5cbiAqL1xuZnVuY3Rpb24gbWtkaXJwKHA6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMocCkpIHtcbiAgICBta2RpcnAocGF0aC5kaXJuYW1lKHApKTtcbiAgICBmcy5ta2RpclN5bmMocCk7XG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgYSBmaWxlLCBmaXJzdCBlbnN1cmluZyB0aGF0IHRoZSBkaXJlY3RvcnkgdG9cbiAqIHdyaXRlIHRvIGV4aXN0cy5cbiAqL1xuZnVuY3Rpb24gd3JpdGVGaWxlU3luYyhwOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuICBta2RpcnAocGF0aC5kaXJuYW1lKHApKTtcbiAgZnMud3JpdGVGaWxlU3luYyhwLCBjb250ZW50KTtcbn1cblxuLyoqXG4gKiBNYWluIGVudHJ5cG9pbnQuXG4gKi9cbmZ1bmN0aW9uIG1haW4oKSB7XG4gIC8vIGZpbmQgYWxsIHBhY2thZ2VzIChpbmNsdWRpbmcgcGFja2FnZXMgaW4gbmVzdGVkIG5vZGVfbW9kdWxlcylcbiAgY29uc3QgcGtncyA9IGZpbmRQYWNrYWdlcygpO1xuXG4gIC8vIGZsYXR0ZW4gZGVwZW5kZW5jaWVzXG4gIGZsYXR0ZW5EZXBlbmRlbmNpZXMocGtncyk7XG5cbiAgLy8gZ2VuZXJhdGUgQmF6ZWwgd29ya3NwYWNlc1xuICBnZW5lcmF0ZUJhemVsV29ya3NwYWNlcyhwa2dzKVxuXG4gIC8vIGdlbmVyYXRlIGFsbCBCVUlMRCBmaWxlc1xuICBnZW5lcmF0ZUJ1aWxkRmlsZXMocGtncylcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1haW4sXG4gIHByaW50UGFja2FnZUJpbixcbiAgYWRkRHluYW1pY0RlcGVuZGVuY2llcyxcbiAgcHJpbnRJbmRleEJ6bCxcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGFsbCBidWlsZCBmaWxlc1xuICovXG5mdW5jdGlvbiBnZW5lcmF0ZUJ1aWxkRmlsZXMocGtnczogRGVwW10pIHtcbiAgZ2VuZXJhdGVSb290QnVpbGRGaWxlKHBrZ3MuZmlsdGVyKHBrZyA9PiAhcGtnLl9pc05lc3RlZCkpXG4gIHBrZ3MuZmlsdGVyKHBrZyA9PiAhcGtnLl9pc05lc3RlZCkuZm9yRWFjaChwa2cgPT4gZ2VuZXJhdGVQYWNrYWdlQnVpbGRGaWxlcyhwa2cpKTtcbiAgZmluZFNjb3BlcygpLmZvckVhY2goc2NvcGUgPT4gZ2VuZXJhdGVTY29wZUJ1aWxkRmlsZXMoc2NvcGUsIHBrZ3MpKTtcbn1cblxuLyoqXG4gKiBGbGF0dGVucyBkZXBlbmRlbmNpZXMgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5EZXBlbmRlbmNpZXMocGtnczogRGVwW10pIHtcbiAgY29uc3QgcGtnc01hcCA9IG5ldyBNYXAoKTtcbiAgcGtncy5mb3JFYWNoKHBrZyA9PiBwa2dzTWFwLnNldChwa2cuX2RpciwgcGtnKSk7XG4gIHBrZ3MuZm9yRWFjaChwa2cgPT4gZmxhdHRlblBrZ0RlcGVuZGVuY2llcyhwa2csIHBrZywgcGtnc01hcCkpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgQmF6ZWwgZmlsZXMgaW4gbnBtIGRpc3RyaWJ1dGlvbnMuXG4gKi9cbmZ1bmN0aW9uIGhpZGVCYXplbEZpbGVzKHBrZzogRGVwKSB7XG4gIGNvbnN0IGhhc0hpZGVCYXplbEZpbGVzID0gaXNEaXJlY3RvcnkoJ25vZGVfbW9kdWxlcy9AYmF6ZWwvaGlkZS1iYXplbC1maWxlcycpO1xuICBwa2cuX2ZpbGVzID0gcGtnLl9maWxlcy5tYXAoZmlsZSA9PiB7XG4gICAgY29uc3QgYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGUpO1xuICAgIGNvbnN0IGJhc2VuYW1lVWMgPSBiYXNlbmFtZS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChiYXNlbmFtZVVjID09PSAnQlVJTEQnIHx8IGJhc2VuYW1lVWMgPT09ICdCVUlMRC5CQVpFTCcpIHtcbiAgICAgIC8vIElmIGJhemVsIGZpbGVzIGFyZSBkZXRlY3RlZCBhbmQgdGhlcmUgaXMgbm8gQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXMgbnBtXG4gICAgICAvLyBwYWNrYWdlIHRoZW4gZXJyb3Igb3V0IGFuZCBzdWdnZXN0IGFkZGluZyB0aGUgcGFja2FnZS4gSXQgaXMgcG9zc2libGUgdG9cbiAgICAgIC8vIGhhdmUgYmF6ZWwgQlVJTEQgZmlsZXMgd2l0aCB0aGUgcGFja2FnZSBpbnN0YWxsZWQgYXMgaXQncyBwb3N0aW5zdGFsbFxuICAgICAgLy8gc3RlcCwgd2hpY2ggaGlkZXMgYmF6ZWwgQlVJTEQgZmlsZXMsIG9ubHkgcnVucyB3aGVuIHRoZSBAYmF6ZWwvaGlkZS1iYXplbC1maWxlc1xuICAgICAgLy8gaXMgaW5zdGFsbGVkIGFuZCBub3Qgd2hlbiBuZXcgcGFja2FnZXMgYXJlIGFkZGVkICh2aWEgYHlhcm4gYWRkYFxuICAgICAgLy8gZm9yIGV4YW1wbGUpIGFmdGVyIHRoZSBpbml0aWFsIGluc3RhbGwuIEluIHRoaXMgY2FzZSwgaG93ZXZlciwgdGhlIHJlcG8gcnVsZVxuICAgICAgLy8gd2lsbCByZS1ydW4gYXMgdGhlIHBhY2thZ2UuanNvbiAmJiBsb2NrIGZpbGUgaGFzIGNoYW5nZWQgc28gd2UganVzdFxuICAgICAgLy8gaGlkZSB0aGUgYWRkZWQgQlVJTEQgZmlsZXMgZHVyaW5nIHRoZSByZXBvIHJ1bGUgcnVuIGhlcmUgc2luY2UgQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXNcbiAgICAgIC8vIHdhcyBub3QgcnVuLlxuICAgICAgaWYgKCFoYXNIaWRlQmF6ZWxGaWxlcyAmJiBFUlJPUl9PTl9CQVpFTF9GSUxFUykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBucG0gcGFja2FnZSAnJHtwa2cuX2Rpcn0nIGZyb20gQCR7V09SS1NQQUNFfSAke1JVTEVfVFlQRX0gcnVsZVxuaGFzIGEgQmF6ZWwgQlVJTEQgZmlsZSAnJHtmaWxlfScuIFVzZSB0aGUgQGJhemVsL2hpZGUtYmF6ZWwtZmlsZXMgdXRpbGl0eSB0byBoaWRlIHRoZXNlIGZpbGVzLlxuU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9ibG9iL21hc3Rlci9wYWNrYWdlcy9oaWRlLWJhemVsLWZpbGVzL1JFQURNRS5tZFxuZm9yIGluc3RhbGxhdGlvbiBpbnN0cnVjdGlvbnMuYCk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEFsbCBCYXplbCBmaWxlcyBpbiB0aGUgbnBtIGRpc3RyaWJ1dGlvbiBzaG91bGQgYmUgcmVuYW1lZCBieVxuICAgICAgICAvLyBhZGRpbmcgYSBgX2AgcHJlZml4IHNvIHRoYXQgZmlsZSB0YXJnZXRzIGRvbid0IGNyb3NzIHBhY2thZ2UgYm91bmRhcmllcy5cbiAgICAgICAgY29uc3QgbmV3RmlsZSA9IHBhdGgucG9zaXguam9pbihwYXRoLmRpcm5hbWUoZmlsZSksIGBfJHtiYXNlbmFtZX1gKTtcbiAgICAgICAgY29uc3Qgc3JjUGF0aCA9IHBhdGgucG9zaXguam9pbignbm9kZV9tb2R1bGVzJywgcGtnLl9kaXIsIGZpbGUpO1xuICAgICAgICBjb25zdCBkc3RQYXRoID0gcGF0aC5wb3NpeC5qb2luKCdub2RlX21vZHVsZXMnLCBwa2cuX2RpciwgbmV3RmlsZSk7XG4gICAgICAgIGZzLnJlbmFtZVN5bmMoc3JjUGF0aCwgZHN0UGF0aCk7XG4gICAgICAgIHJldHVybiBuZXdGaWxlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmlsZTtcbiAgfSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIHRoZSByb290IEJVSUxEIGZpbGUuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlUm9vdEJ1aWxkRmlsZShwa2dzOiBEZXBbXSkge1xuICBsZXQgZXhwb3J0c1N0YXJsYXJrID0gJyc7XG4gIHBrZ3MuZm9yRWFjaChwa2cgPT4ge3BrZy5fZmlsZXMuZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICAgZXhwb3J0c1N0YXJsYXJrICs9IGAgICAgXCJub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtmfVwiLFxuYDtcbiAgICAgICAgICAgICAgIH0pfSk7XG5cbiAgbGV0IHNyY3NTdGFybGFyayA9ICcnO1xuICBpZiAocGtncy5sZW5ndGgpIHtcbiAgICBjb25zdCBsaXN0ID0gcGtncy5tYXAocGtnID0+IGBcIi8vJHtwa2cuX2Rpcn06JHtwa2cuX25hbWV9X19maWxlc1wiLGApLmpvaW4oJ1xcbiAgICAgICAgJyk7XG4gICAgc3Jjc1N0YXJsYXJrID0gYFxuICAgICMgZGlyZWN0IHNvdXJjZXMgbGlzdGVkIGZvciBzdHJpY3QgZGVwcyBzdXBwb3J0XG4gICAgc3JjcyA9IFtcbiAgICAgICAgJHtsaXN0fVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBkZXBzU3RhcmxhcmsgPSAnJztcbiAgaWYgKHBrZ3MubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IHBrZ3MubWFwKHBrZyA9PiBgXCIvLyR7cGtnLl9kaXJ9OiR7cGtnLl9uYW1lfV9fY29udGVudHNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIGRlcHNTdGFybGFyayA9IGBcbiAgICAjIGZsYXR0ZW5lZCBsaXN0IG9mIGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgaG9pc3RlZCB0byByb290IGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXJcbiAgICBkZXBzID0gW1xuICAgICAgICAke2xpc3R9XG4gICAgXSxgO1xuICB9XG5cbiAgbGV0IGJ1aWxkRmlsZSA9IEJVSUxEX0ZJTEVfSEVBREVSICtcbiAgICAgIGBsb2FkKFwiQGJ1aWxkX2JhemVsX3J1bGVzX25vZGVqcy8vaW50ZXJuYWwvbnBtX2luc3RhbGw6bm9kZV9tb2R1bGVfbGlicmFyeS5iemxcIiwgXCJub2RlX21vZHVsZV9saWJyYXJ5XCIpXG5cbmV4cG9ydHNfZmlsZXMoW1xuJHtleHBvcnRzU3Rhcmxhcmt9XSlcblxuIyBUaGUgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSBpbiBvbmUgY2F0Y2gtYWxsIG5vZGVfbW9kdWxlX2xpYnJhcnkuXG4jIE5COiBVc2luZyB0aGlzIHRhcmdldCBtYXkgaGF2ZSBiYWQgcGVyZm9ybWFuY2UgaW1wbGljYXRpb25zIGlmXG4jIHRoZXJlIGFyZSBtYW55IGZpbGVzIGluIHRhcmdldC5cbiMgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy81MTUzLlxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCJub2RlX21vZHVsZXNcIiwke3NyY3NTdGFybGFya30ke2RlcHNTdGFybGFya31cbilcblxuYFxuXG4gIC8vIEFkZCB0aGUgbWFudWFsIGJ1aWxkIGZpbGUgY29udGVudHMgaWYgdGhleSBleGlzdHNcbiAgdHJ5IHtcbiAgICBidWlsZEZpbGUgKz0gZnMucmVhZEZpbGVTeW5jKGBtYW51YWxfYnVpbGRfZmlsZV9jb250ZW50c2AsIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgfVxuXG4gIHdyaXRlRmlsZVN5bmMoJ0JVSUxELmJhemVsJywgYnVpbGRGaWxlKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYWxsIEJVSUxEICYgYnpsIGZpbGVzIGZvciBhIHBhY2thZ2UuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlUGFja2FnZUJ1aWxkRmlsZXMocGtnOiBEZXApIHtcbiAgbGV0IGJ1aWxkRmlsZSA9IHByaW50UGFja2FnZShwa2cpO1xuXG4gIGNvbnN0IGJpbkJ1aWxkRmlsZSA9IHByaW50UGFja2FnZUJpbihwa2cpO1xuICBpZiAoYmluQnVpbGRGaWxlLmxlbmd0aCkge1xuICAgIHdyaXRlRmlsZVN5bmMoXG4gICAgICAgIHBhdGgucG9zaXguam9pbihwa2cuX2RpciwgJ2JpbicsICdCVUlMRC5iYXplbCcpLCBCVUlMRF9GSUxFX0hFQURFUiArIGJpbkJ1aWxkRmlsZSk7XG4gIH1cblxuICBjb25zdCBpbmRleEZpbGUgPSBwcmludEluZGV4QnpsKHBrZyk7XG4gIGlmIChpbmRleEZpbGUubGVuZ3RoKSB7XG4gICAgd3JpdGVGaWxlU3luYyhwYXRoLnBvc2l4LmpvaW4ocGtnLl9kaXIsICdpbmRleC5iemwnKSwgaW5kZXhGaWxlKTtcbiAgICBidWlsZEZpbGUgPSBgJHtidWlsZEZpbGV9XG4jIEZvciBpbnRlZ3JhdGlvbiB0ZXN0aW5nXG5leHBvcnRzX2ZpbGVzKFtcImluZGV4LmJ6bFwiXSlcbmA7XG4gIH1cblxuICB3cml0ZUZpbGVTeW5jKHBhdGgucG9zaXguam9pbihwa2cuX2RpciwgJ0JVSUxELmJhemVsJyksIEJVSUxEX0ZJTEVfSEVBREVSICsgYnVpbGRGaWxlKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBpbnN0YWxsXzx3b3Jrc3BhY2VfbmFtZT4uYnpsIGZpbGVzIHdpdGggZnVuY3Rpb24gdG8gaW5zdGFsbCBlYWNoIHdvcmtzcGFjZS5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVCYXplbFdvcmtzcGFjZXMocGtnczogRGVwW10pIHtcbiAgY29uc3Qgd29ya3NwYWNlczogQmFnPHN0cmluZz4gPSB7fTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBwa2dzKSB7XG4gICAgaWYgKCFwa2cuYmF6ZWxXb3Jrc3BhY2VzKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHdvcmtzcGFjZSBvZiBPYmplY3Qua2V5cyhwa2cuYmF6ZWxXb3Jrc3BhY2VzKSkge1xuICAgICAgLy8gQSBiYXplbCB3b3Jrc3BhY2UgY2FuIG9ubHkgYmUgc2V0dXAgYnkgb25lIG5wbSBwYWNrYWdlXG4gICAgICBpZiAod29ya3NwYWNlc1t3b3Jrc3BhY2VdKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICBgQ291bGQgbm90IHNldHVwIEJhemVsIHdvcmtzcGFjZSAke3dvcmtzcGFjZX0gcmVxdWVzdGVkIGJ5IG5wbSBgICtcbiAgICAgICAgICAgIGBwYWNrYWdlICR7cGtnLl9kaXJ9QCR7cGtnLnZlcnNpb259LiBBbHJlYWR5IHNldHVwIGJ5ICR7d29ya3NwYWNlc1t3b3Jrc3BhY2VdfWApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9XG5cbiAgICAgIGdlbmVyYXRlQmF6ZWxXb3Jrc3BhY2UocGtnLCB3b3Jrc3BhY2UpO1xuXG4gICAgICAvLyBLZWVwIHRyYWNrIG9mIHdoaWNoIG5wbSBwYWNrYWdlIHNldHVwIHRoaXMgYmF6ZWwgd29ya3NwYWNlIGZvciBsYXRlciB1c2VcbiAgICAgIHdvcmtzcGFjZXNbd29ya3NwYWNlXSA9IGAke3BrZy5fZGlyfUAke3BrZy52ZXJzaW9ufWA7XG4gICAgfVxuICB9XG5cbiAgLy8gRmluYWxseSBnZW5lcmF0ZSBpbnN0YWxsX2JhemVsX2RlcGVuZGVuY2llcy5iemxcbiAgZ2VuZXJhdGVJbnN0YWxsQmF6ZWxEZXBlbmRlbmNpZXMoT2JqZWN0LmtleXMod29ya3NwYWNlcykpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGluc3RhbGxfPHdvcmtzcGFjZT4uYnpsIGZpbGUgd2l0aCBmdW5jdGlvbiB0byBpbnN0YWxsIHRoZSB3b3Jrc3BhY2UuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlQmF6ZWxXb3Jrc3BhY2UocGtnOiBEZXAsIHdvcmtzcGFjZTogc3RyaW5nKSB7XG4gIGxldCBiemxGaWxlID0gYCMgR2VuZXJhdGVkIGJ5IHRoZSB5YXJuX2luc3RhbGwvbnBtX2luc3RhbGwgcnVsZVxubG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvL2ludGVybmFsL2NvcHlfcmVwb3NpdG9yeTpjb3B5X3JlcG9zaXRvcnkuYnpsXCIsIFwiY29weV9yZXBvc2l0b3J5XCIpXG5cbmRlZiBfbWF5YmUocmVwb19ydWxlLCBuYW1lLCAqKmt3YXJncyk6XG4gICAgaWYgbmFtZSBub3QgaW4gbmF0aXZlLmV4aXN0aW5nX3J1bGVzKCk6XG4gICAgICAgIHJlcG9fcnVsZShuYW1lID0gbmFtZSwgKiprd2FyZ3MpXG5gO1xuXG4gIGNvbnN0IHJvb3RQYXRoID0gcGtnLmJhemVsV29ya3NwYWNlc1t3b3Jrc3BhY2VdLnJvb3RQYXRoO1xuICBpZiAoIXJvb3RQYXRoKSB7XG4gICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgYE1hbGZvcm1lZCBiYXplbFdvcmtzcGFjZXMgYXR0cmlidXRlIGluICR7cGtnLl9kaXJ9QCR7cGtnLnZlcnNpb259LiBgICtcbiAgICAgICAgYE1pc3Npbmcgcm9vdFBhdGggZm9yIHdvcmtzcGFjZSAke3dvcmtzcGFjZX0uYCk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG5cbiAgLy8gQ29weSBhbGwgZmlsZXMgZm9yIHRoaXMgd29ya3NwYWNlIHRvIGEgZm9sZGVyIHVuZGVyIF93b3Jrc3BhY2VzXG4gIC8vIHRvIHJlc3RvcmUgdGhlIEJhemVsIGZpbGVzIHdoaWNoIGhhdmUgYmUgcmVuYW1lZCBmcm9tIHRoZSBucG0gcGFja2FnZVxuICBjb25zdCB3b3Jrc3BhY2VTb3VyY2VQYXRoID0gcGF0aC5wb3NpeC5qb2luKCdfd29ya3NwYWNlcycsIHdvcmtzcGFjZSk7XG4gIG1rZGlycCh3b3Jrc3BhY2VTb3VyY2VQYXRoKTtcbiAgcGtnLl9maWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xuICAgIGlmICgvXm5vZGVfbW9kdWxlc1svXFxcXF0vLnRlc3QoZmlsZSkpIHtcbiAgICAgIC8vIGRvbid0IGNvcHkgb3ZlciBuZXN0ZWQgbm9kZV9tb2R1bGVzXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBkZXN0RmlsZSA9IHBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpO1xuICAgIGlmIChkZXN0RmlsZS5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICAvLyB0aGlzIGZpbGUgaXMgbm90IHVuZGVyIHRoZSByb290UGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSk7XG4gICAgY29uc3QgYmFzZW5hbWVVYyA9IGJhc2VuYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgLy8gQmF6ZWwgQlVJTEQgZmlsZXMgZnJvbSBucG0gZGlzdHJpYnV0aW9uIHdvdWxkIGhhdmUgYmVlbiByZW5hbWVkIGVhcmxpZXIgd2l0aCBhIF8gcHJlZml4IHNvXG4gICAgLy8gd2UgcmVzdG9yZSB0aGUgbmFtZSBvbiB0aGUgY29weVxuICAgIGlmIChiYXNlbmFtZVVjID09PSAnX0JVSUxEJyB8fCBiYXNlbmFtZVVjID09PSAnX0JVSUxELkJBWkVMJykge1xuICAgICAgZGVzdEZpbGUgPSBwYXRoLnBvc2l4LmpvaW4ocGF0aC5kaXJuYW1lKGRlc3RGaWxlKSwgYmFzZW5hbWUuc3Vic3RyKDEpKTtcbiAgICB9XG4gICAgY29uc3Qgc3JjID0gcGF0aC5wb3NpeC5qb2luKCdub2RlX21vZHVsZXMnLCBwa2cuX2RpciwgZmlsZSk7XG4gICAgY29uc3QgZGVzdCA9IHBhdGgucG9zaXguam9pbih3b3Jrc3BhY2VTb3VyY2VQYXRoLCBkZXN0RmlsZSk7XG4gICAgbWtkaXJwKHBhdGguZGlybmFtZShkZXN0KSk7XG4gICAgZnMuY29weUZpbGVTeW5jKHNyYywgZGVzdCk7XG4gIH0pO1xuXG4gIC8vIFdlIGNyZWF0ZSBfYmF6ZWxfd29ya3NwYWNlX21hcmtlciB0aGF0IGlzIHVzZWQgYnkgdGhlIGN1c3RvbSBjb3B5X3JlcG9zaXRvcnlcbiAgLy8gcnVsZSB0byByZXNvbHZlIHRoZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IHNvdXJjZSByb290LiBBIHJvb3QgQlVJTEQgZmlsZVxuICAvLyBpcyByZXF1aXJlZCB0byByZWZlcmVuY2UgX2JhemVsX3dvcmtzcGFjZV9tYXJrZXIgYXMgYSB0YXJnZXQgc28gd2UgYWxzbyBjcmVhdGVcbiAgLy8gYW4gZW1wdHkgb25lIGlmIG9uZSBkb2VzIG5vdCBleGlzdC5cbiAgaWYgKCFoYXNSb290QnVpbGRGaWxlKHBrZywgcm9vdFBhdGgpKSB7XG4gICAgd3JpdGVGaWxlU3luYyhcbiAgICAgICAgcGF0aC5wb3NpeC5qb2luKHdvcmtzcGFjZVNvdXJjZVBhdGgsICdCVUlMRC5iYXplbCcpLFxuICAgICAgICAnIyBNYXJrZXIgZmlsZSB0aGF0IHRoaXMgZGlyZWN0b3J5IGlzIGEgYmF6ZWwgcGFja2FnZScpO1xuICB9XG4gIHdyaXRlRmlsZVN5bmMoXG4gICAgICBwYXRoLnBvc2l4LmpvaW4od29ya3NwYWNlU291cmNlUGF0aCwgJ19iYXplbF93b3Jrc3BhY2VfbWFya2VyJyksXG4gICAgICAnIyBNYXJrZXIgZmlsZSB0byB1c2VkIGJ5IGN1c3RvbSBjb3B5X3JlcG9zaXRvcnkgcnVsZScpO1xuXG4gIGJ6bEZpbGUgKz0gYGRlZiBpbnN0YWxsXyR7d29ya3NwYWNlfSgpOlxuICAgIF9tYXliZShcbiAgICAgICAgY29weV9yZXBvc2l0b3J5LFxuICAgICAgICBuYW1lID0gXCIke3dvcmtzcGFjZX1cIixcbiAgICAgICAgbWFya2VyX2ZpbGUgPSBcIkAke1dPUktTUEFDRX0vL193b3Jrc3BhY2VzLyR7d29ya3NwYWNlfTpfYmF6ZWxfd29ya3NwYWNlX21hcmtlclwiLFxuICAgICAgICAjIEVuc3VyZSB0aGF0IGNoYW5nZXMgdG8gdGhlIG5vZGVfbW9kdWxlcyBjYXVzZSB0aGUgY29weSB0byByZS1leGVjdXRlXG4gICAgICAgIGxvY2tfZmlsZSA9IFwiQCR7V09SS1NQQUNFfSR7TE9DS19GSUxFX0xBQkVMfVwiLFxuICAgIClcbmA7XG5cbiAgd3JpdGVGaWxlU3luYyhgaW5zdGFsbF8ke3dvcmtzcGFjZX0uYnpsYCwgYnpsRmlsZSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgaW5zdGFsbF9iYXplbF9kZXBlbmRlbmNpZXMuYnpsIHdpdGggZnVuY3Rpb24gdG8gaW5zdGFsbCBhbGwgd29ya3NwYWNlcy5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVJbnN0YWxsQmF6ZWxEZXBlbmRlbmNpZXMod29ya3NwYWNlczogc3RyaW5nW10pIHtcbiAgbGV0IGJ6bEZpbGUgPSBgIyBHZW5lcmF0ZWQgYnkgdGhlIHlhcm5faW5zdGFsbC9ucG1faW5zdGFsbCBydWxlXG5gO1xuICB3b3Jrc3BhY2VzLmZvckVhY2god29ya3NwYWNlID0+IHtcbiAgICBiemxGaWxlICs9IGBsb2FkKFxcXCI6aW5zdGFsbF8ke3dvcmtzcGFjZX0uYnpsXFxcIiwgXFxcImluc3RhbGxfJHt3b3Jrc3BhY2V9XFxcIilcbmA7XG4gIH0pO1xuICBiemxGaWxlICs9IGBkZWYgaW5zdGFsbF9iYXplbF9kZXBlbmRlbmNpZXMoKTpcbiAgICBcIlwiXCJJbnN0YWxscyBhbGwgd29ya3NwYWNlcyBsaXN0ZWQgaW4gYmF6ZWxXb3Jrc3BhY2VzIG9mIGFsbCBucG0gcGFja2FnZXNcIlwiXCJcbmA7XG4gIHdvcmtzcGFjZXMuZm9yRWFjaCh3b3Jrc3BhY2UgPT4ge1xuICAgIGJ6bEZpbGUgKz0gYCAgICBpbnN0YWxsXyR7d29ya3NwYWNlfSgpXG5gO1xuICB9KTtcblxuICB3cml0ZUZpbGVTeW5jKCdpbnN0YWxsX2JhemVsX2RlcGVuZGVuY2llcy5iemwnLCBiemxGaWxlKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBidWlsZCBmaWxlcyBmb3IgYSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVTY29wZUJ1aWxkRmlsZXMoc2NvcGU6IHN0cmluZywgcGtnczogRGVwW10pIHtcbiAgY29uc3QgYnVpbGRGaWxlID0gQlVJTERfRklMRV9IRUFERVIgKyBwcmludFNjb3BlKHNjb3BlLCBwa2dzKTtcbiAgd3JpdGVGaWxlU3luYyhwYXRoLnBvc2l4LmpvaW4oc2NvcGUsICdCVUlMRC5iYXplbCcpLCBidWlsZEZpbGUpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBhIHBhdGggaXMgYSBmaWxlLlxuICovXG5mdW5jdGlvbiBpc0ZpbGUocDogc3RyaW5nKSB7XG4gIHJldHVybiBmcy5leGlzdHNTeW5jKHApICYmIGZzLnN0YXRTeW5jKHApLmlzRmlsZSgpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBhIHBhdGggaXMgYW4gbnBtIHBhY2thZ2Ugd2hpY2ggaXMgaXMgYSBkaXJlY3Rvcnkgd2l0aCBhIHBhY2thZ2UuanNvbiBmaWxlLlxuICovXG5mdW5jdGlvbiBpc0RpcmVjdG9yeShwOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGZzLmV4aXN0c1N5bmMocCkgJiYgZnMuc3RhdFN5bmMocCkuaXNEaXJlY3RvcnkoKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIGFsbCB0aGUgZmlsZXMgdW5kZXIgYSBkaXJlY3RvcnkgYXMgcmVsYXRpdmVcbiAqIHBhdGhzIHRvIHRoZSBkaXJlY3RvcnkuXG4gKi9cbmZ1bmN0aW9uIGxpc3RGaWxlcyhyb290RGlyOiBzdHJpbmcsIHN1YkRpcjogc3RyaW5nID0gJycpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGRpciA9IHBhdGgucG9zaXguam9pbihyb290RGlyLCBzdWJEaXIpO1xuICBpZiAoIWlzRGlyZWN0b3J5KGRpcikpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGRpcilcbiAgICAgIC5yZWR1Y2UoXG4gICAgICAgICAgKGZpbGVzOiBzdHJpbmdbXSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnBvc2l4LmpvaW4oZGlyLCBmaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbFBhdGggPSBwYXRoLnBvc2l4LmpvaW4oc3ViRGlyLCBmaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IGlzU3ltYm9saWNMaW5rID0gZnMubHN0YXRTeW5jKGZ1bGxQYXRoKS5pc1N5bWJvbGljTGluaygpO1xuICAgICAgICAgICAgbGV0IHN0YXQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBpZiAoaXNTeW1ib2xpY0xpbmspIHtcbiAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IGJyb2tlbiBzeW1ib2xpYyBsaW5rcy4gVGhlc2UgY2F1c2UgZnMuc3RhdFN5bmMoZnVsbFBhdGgpXG4gICAgICAgICAgICAgICAgLy8gdG8gZmFpbCB3aXRoIGBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkgLi4uYFxuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlcztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaXNEaXJlY3RvcnkgPSBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICBpZiAoaXNEaXJlY3RvcnkgJiYgaXNTeW1ib2xpY0xpbmspIHtcbiAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBzeW1ib2xpYyBsaW5rcyB0byBkaXJlY3Rvcmllcy4gQW4gaXNzdWUgaW4geWFybiB2ZXJzaW9uc1xuICAgICAgICAgICAgICAvLyBvbGRlciB0aGFuIDEuMTIuMSBjcmVhdGVzIHN5bWJvbGljIGxpbmtzIHRvIGZvbGRlcnMgaW4gdGhlIC5iaW4gZm9sZGVyXG4gICAgICAgICAgICAgIC8vIHdoaWNoIGxlYWRzIHRvIEJhemVsIHRhcmdldHMgdGhhdCBjcm9zcyBwYWNrYWdlIGJvdW5kYXJpZXMuXG4gICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzQyOCBhbmRcbiAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy80MzguXG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgdGVzdGVkIGluIC9lMmUvZmluZV9ncmFpbmVkX3N5bWxpbmtzLlxuICAgICAgICAgICAgICByZXR1cm4gZmlsZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaXNEaXJlY3RvcnkgPyBmaWxlcy5jb25jYXQobGlzdEZpbGVzKHJvb3REaXIsIHJlbFBhdGgpKSA6IGZpbGVzLmNvbmNhdChyZWxQYXRoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKVxuICAgICAgLy8gRmlsZXMgd2l0aCBzcGFjZXMgKFxceDIwKSBvciB1bmljb2RlIGNoYXJhY3RlcnMgKDxcXHgyMCAmJiA+XFx4N0UpIGFyZSBub3QgYWxsb3dlZCBpblxuICAgICAgLy8gQmF6ZWwgcnVuZmlsZXMuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvNDMyN1xuICAgICAgLmZpbHRlcihmID0+ICEvW15cXHgyMS1cXHg3RV0vLnRlc3QoZikpXG4gICAgICAvLyBXZSByZXR1cm4gYSBzb3J0ZWQgYXJyYXkgc28gdGhhdCB0aGUgb3JkZXIgb2YgZmlsZXNcbiAgICAgIC8vIGlzIHRoZSBzYW1lIHJlZ2FyZGxlc3Mgb2YgcGxhdGZvcm1cbiAgICAgIC5zb3J0KCk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBucG0gcGFja2FnZSBkaXN0cmlidXRpb24gY29udGFpbmVkIGFcbiAqIHJvb3QgL0JVSUxEIG9yIC9CVUlMRC5iYXplbCBmaWxlLlxuICovXG5mdW5jdGlvbiBoYXNSb290QnVpbGRGaWxlKHBrZzogRGVwLCByb290UGF0aDogc3RyaW5nKSB7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBwa2cuX2ZpbGVzKSB7XG4gICAgLy8gQmF6ZWwgZmlsZXMgd291bGQgaGF2ZSBiZWVuIHJlbmFtZWQgZWFybGllciB3aXRoIGEgYF9gIHByZWZpeFxuICAgIGNvbnN0IGZpbGVVYyA9IHBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKGZpbGVVYyA9PT0gJ19CVUlMRCcgfHwgZmlsZVVjID09PSAnX0JVSUxELkJBWkVMJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBhZGREeW5hbWljRGVwZW5kZW5jaWVzKHBrZ3M6IERlcFtdLCBkeW5hbWljX2RlcHMgPSBEWU5BTUlDX0RFUFMpIHtcbiAgZnVuY3Rpb24gbWF0Y2gobmFtZTogc3RyaW5nLCBwOiBEZXApIHtcbiAgICAvLyBBdXRvbWF0aWNhbGx5IGluY2x1ZGUgZHluYW1pYyBkZXBlbmRlbmN5IG9uIHBsdWdpbnMgb2YgdGhlIGZvcm0gcGtnLXBsdWdpbi1mb29cbiAgICBpZiAobmFtZS5zdGFydHNXaXRoKGAke3AuX21vZHVsZU5hbWV9LXBsdWdpbi1gKSkgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCB2YWx1ZSA9IGR5bmFtaWNfZGVwc1twLl9tb2R1bGVOYW1lXTtcbiAgICBpZiAobmFtZSA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gU3VwcG9ydCB3aWxkY2FyZCBtYXRjaFxuICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5pbmNsdWRlcygnKicpICYmIG5hbWUuc3RhcnRzV2l0aCh2YWx1ZS5zdWJzdHJpbmcoMCwgdmFsdWUuaW5kZXhPZignKicpKSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBwa2dzLmZvckVhY2gocCA9PiB7XG4gICAgcC5fZHluYW1pY0RlcGVuZGVuY2llcyA9IHBrZ3MuZmlsdGVyKHggPT4gISF4Ll9tb2R1bGVOYW1lICYmIG1hdGNoKHguX21vZHVsZU5hbWUsIHApKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkeW4gPT4gYC8vJHtkeW4uX2Rpcn06JHtkeW4uX25hbWV9YCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpbmRzIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIGFsbCBwYWNrYWdlcyB1bmRlciBhIGdpdmVuIHBhdGguXG4gKi9cbmZ1bmN0aW9uIGZpbmRQYWNrYWdlcyhwID0gJ25vZGVfbW9kdWxlcycpIHtcbiAgaWYgKCFpc0RpcmVjdG9yeShwKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IHBrZ3M6IERlcFtdID0gW107XG5cbiAgY29uc3QgbGlzdGluZyA9IGZzLnJlYWRkaXJTeW5jKHApO1xuXG4gIGNvbnN0IHBhY2thZ2VzID0gbGlzdGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IHNjb3Blc1xuICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gIWYuc3RhcnRzV2l0aCgnQCcpKVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IGZvbGRlcnMgc3VjaCBhcyBgLmJpbmAgd2hpY2ggY2FuIGNyZWF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBpc3N1ZXMgb24gV2luZG93cyBzaW5jZSB0aGVzZSBhcmUgXCJoaWRkZW5cIiBieSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZiA9PiAhZi5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBwYXRoLnBvc2l4LmpvaW4ocCwgZikpXG4gICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZiA9PiBpc0RpcmVjdG9yeShmKSk7XG5cbiAgcGFja2FnZXMuZm9yRWFjaChcbiAgICAgIGYgPT4gcGtncy5wdXNoKHBhcnNlUGFja2FnZShmKSwgLi4uZmluZFBhY2thZ2VzKHBhdGgucG9zaXguam9pbihmLCAnbm9kZV9tb2R1bGVzJykpKSk7XG5cbiAgY29uc3Qgc2NvcGVzID0gbGlzdGluZy5maWx0ZXIoZiA9PiBmLnN0YXJ0c1dpdGgoJ0AnKSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBwYXRoLnBvc2l4LmpvaW4ocCwgZikpXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGYgPT4gaXNEaXJlY3RvcnkoZikpO1xuICBzY29wZXMuZm9yRWFjaChmID0+IHBrZ3MucHVzaCguLi5maW5kUGFja2FnZXMoZikpKTtcblxuICBhZGREeW5hbWljRGVwZW5kZW5jaWVzKHBrZ3MpO1xuXG4gIHJldHVybiBwa2dzO1xufVxuXG4vKipcbiAqIEZpbmRzIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIGFsbCBwYWNrYWdlIHNjb3BlcyBpbiBub2RlX21vZHVsZXMuXG4gKi9cbmZ1bmN0aW9uIGZpbmRTY29wZXMoKSB7XG4gIGNvbnN0IHAgPSAnbm9kZV9tb2R1bGVzJztcbiAgaWYgKCFpc0RpcmVjdG9yeShwKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IGxpc3RpbmcgPSBmcy5yZWFkZGlyU3luYyhwKTtcblxuICBjb25zdCBzY29wZXMgPSBsaXN0aW5nLmZpbHRlcihmID0+IGYuc3RhcnRzV2l0aCgnQCcpKVxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmID0+IHBhdGgucG9zaXguam9pbihwLCBmKSlcbiAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZiA9PiBpc0RpcmVjdG9yeShmKSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBmLnJlcGxhY2UoL15ub2RlX21vZHVsZXNcXC8vLCAnJykpO1xuXG4gIHJldHVybiBzY29wZXM7XG59XG5cbi8qKlxuICogR2l2ZW4gdGhlIG5hbWUgb2YgYSB0b3AtbGV2ZWwgZm9sZGVyIGluIG5vZGVfbW9kdWxlcywgcGFyc2UgdGhlXG4gKiBwYWNrYWdlIGpzb24gYW5kIHJldHVybiBpdCBhcyBhbiBvYmplY3QgYWxvbmcgd2l0aFxuICogc29tZSBhZGRpdGlvbmFsIGludGVybmFsIGF0dHJpYnV0ZXMgcHJlZml4ZWQgd2l0aCAnXycuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlUGFja2FnZShwOiBzdHJpbmcpOiBEZXAge1xuICAvLyBQYXJzZSB0aGUgcGFja2FnZS5qc29uIGZpbGUgb2YgdGhpcyBwYWNrYWdlXG4gIGNvbnN0IHBhY2thZ2VKc29uID0gcGF0aC5wb3NpeC5qb2luKHAsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGtnID0gaXNGaWxlKHBhY2thZ2VKc29uKSA/IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCB7ZW5jb2Rpbmc6ICd1dGY4J30pKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dmVyc2lvbjogJzAuMC4wJ307XG5cbiAgLy8gVHJpbSB0aGUgbGVhZGluZyBub2RlX21vZHVsZXMgZnJvbSB0aGUgcGF0aCBhbmRcbiAgLy8gYXNzaWduIHRvIF9kaXIgZm9yIGZ1dHVyZSB1c2VcbiAgcGtnLl9kaXIgPSBwLnJlcGxhY2UoL15ub2RlX21vZHVsZXNcXC8vLCAnJyk7XG5cbiAgLy8gU3Rhc2ggdGhlIHBhY2thZ2UgZGlyZWN0b3J5IG5hbWUgZm9yIGZ1dHVyZSB1c2VcbiAgcGtnLl9uYW1lID0gcGtnLl9kaXIuc3BsaXQoJy8nKS5wb3AoKTtcblxuICAvLyBNb2R1bGUgbmFtZSBvZiB0aGUgcGFja2FnZS4gVW5saWtlIFwiX25hbWVcIiB0aGlzIHJlcHJlc2VudHMgdGhlXG4gIC8vIGZ1bGwgcGFja2FnZSBuYW1lIChpbmNsdWRpbmcgc2NvcGUgbmFtZSkuXG4gIHBrZy5fbW9kdWxlTmFtZSA9IHBrZy5uYW1lIHx8IGAke3BrZy5fZGlyfS8ke3BrZy5fbmFtZX1gO1xuXG4gIC8vIEtlZXAgdHJhY2sgb2Ygd2hldGhlciBvciBub3QgdGhpcyBpcyBhIG5lc3RlZCBwYWNrYWdlXG4gIHBrZy5faXNOZXN0ZWQgPSAvXFwvbm9kZV9tb2R1bGVzXFwvLy50ZXN0KHApO1xuXG4gIC8vIExpc3QgYWxsIHRoZSBmaWxlcyBpbiB0aGUgbnBtIHBhY2thZ2UgZm9yIGxhdGVyIHVzZVxuICBwa2cuX2ZpbGVzID0gbGlzdEZpbGVzKHApO1xuXG4gIC8vIEluaXRpYWxpemUgX2RlcGVuZGVuY2llcyB0byBhbiBlbXB0eSBhcnJheVxuICAvLyB3aGljaCBpcyBsYXRlciBmaWxsZWQgd2l0aCB0aGUgZmxhdHRlbmVkIGRlcGVuZGVuY3kgbGlzdFxuICBwa2cuX2RlcGVuZGVuY2llcyA9IFtdO1xuXG4gIC8vIEhpZGUgYmF6ZWwgZmlsZXMgaW4gdGhpcyBwYWNrYWdlLiBXZSBkbyB0aGlzIGJlZm9yZSBwYXJzaW5nXG4gIC8vIHRoZSBuZXh0IHBhY2thZ2UgdG8gcHJldmVudCBpc3N1ZXMgY2F1c2VkIGJ5IHN5bWxpbmtzIGJldHdlZW5cbiAgLy8gcGFja2FnZSBhbmQgbmVzdGVkIHBhY2thZ2VzIHNldHVwIGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXIuXG4gIGhpZGVCYXplbEZpbGVzKHBrZyk7XG5cbiAgcmV0dXJuIHBrZztcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIGJpbiBlbnRyeSBpcyBhIG5vbi1lbXB0eSBwYXRoXG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRCaW5QYXRoKGVudHJ5OiBhbnkpIHtcbiAgcmV0dXJuIGlzVmFsaWRCaW5QYXRoU3RyaW5nVmFsdWUoZW50cnkpIHx8IGlzVmFsaWRCaW5QYXRoT2JqZWN0VmFsdWVzKGVudHJ5KTtcbn1cblxuLyoqXG4gKiBJZiBnaXZlbiBhIHN0cmluZywgY2hlY2sgaWYgYSBiaW4gZW50cnkgaXMgYSBub24tZW1wdHkgcGF0aFxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQmluUGF0aFN0cmluZ1ZhbHVlKGVudHJ5OiBhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBlbnRyeSA9PT0gJ3N0cmluZycgJiYgZW50cnkgIT09ICcnO1xufVxuXG4vKipcbiAqIElmIGdpdmVuIGFuIG9iamVjdCBsaXRlcmFsLCBjaGVjayBpZiBhIGJpbiBlbnRyeSBvYmplY3RzIGhhcyBhdCBsZWFzdCBvbmUgYSBub24tZW1wdHkgcGF0aFxuICogRXhhbXBsZSAxOiB7IGVudHJ5OiAnLi9wYXRoL3RvL3NjcmlwdC5qcycgfSA9PT4gVkFMSURcbiAqIEV4YW1wbGUgMjogeyBlbnRyeTogJycgfSA9PT4gSU5WQUxJRFxuICogRXhhbXBsZSAzOiB7IGVudHJ5OiAnLi9wYXRoL3RvL3NjcmlwdC5qcycsIGVtcHR5OiAnJyB9ID09PiBWQUxJRFxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQmluUGF0aE9iamVjdFZhbHVlcyhlbnRyeTogQmFnPHN0cmluZz4pOiBib29sZWFuIHtcbiAgLy8gV2UgYWxsb3cgYXQgbGVhc3Qgb25lIHZhbGlkIGVudHJ5IHBhdGggKGlmIGFueSkuXG4gIHJldHVybiBlbnRyeSAmJiB0eXBlb2YgZW50cnkgPT09ICdvYmplY3QnICYmXG4gICAgICBPYmplY3RbJ3ZhbHVlcyddKGVudHJ5KS5maWx0ZXIoX2VudHJ5ID0+IGlzVmFsaWRCaW5QYXRoKF9lbnRyeSkpLmxlbmd0aCA+IDA7XG59XG5cbi8qKlxuICogQ2xlYW51cCBhIHBhY2thZ2UuanNvbiBcImJpblwiIHBhdGguXG4gKlxuICogQmluIHBhdGhzIHVzdWFsbHkgY29tZSBpbiAyIGZsYXZvcnM6ICcuL2Jpbi9mb28nIG9yICdiaW4vZm9vJyxcbiAqIHNvbWV0aW1lcyBvdGhlciBzdHVmZiBsaWtlICdsaWIvZm9vJy4gIFJlbW92ZSBwcmVmaXggJy4vJyBpZiBpdFxuICogZXhpc3RzLlxuICovXG5mdW5jdGlvbiBjbGVhbnVwQmluUGF0aChwOiBzdHJpbmcpIHtcbiAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAocC5pbmRleE9mKCcuLycpID09PSAwKSB7XG4gICAgcCA9IHAuc2xpY2UoMik7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG5cbi8qKlxuICogQ2xlYW51cCBhIHBhY2thZ2UuanNvbiBlbnRyeSBwb2ludCBzdWNoIGFzIFwibWFpblwiXG4gKlxuICogUmVtb3ZlcyAnLi8nIGlmIGl0IGV4aXN0cy5cbiAqIEFwcGVuZHMgYGluZGV4LmpzYCBpZiBwIGVuZHMgd2l0aCBgL2AuXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBFbnRyeVBvaW50UGF0aChwOiBzdHJpbmcpIHtcbiAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAocC5pbmRleE9mKCcuLycpID09PSAwKSB7XG4gICAgcCA9IHAuc2xpY2UoMik7XG4gIH1cbiAgaWYgKHAuZW5kc1dpdGgoJy8nKSkge1xuICAgIHAgKz0gJ2luZGV4LmpzJztcbiAgfVxuICByZXR1cm4gcDtcbn1cblxuLyoqXG4gKiBDbGVhbnMgdXAgdGhlIGdpdmVuIHBhdGhcbiAqIFRoZW4gdHJpZXMgdG8gcmVzb2x2ZSB0aGUgcGF0aCBpbnRvIGEgZmlsZSBhbmQgd2FybnMgaWYgVkVSQk9TRV9MT0dTIHNldCBhbmQgdGhlIGZpbGUgZG9zZW4ndFxuICogZXhpc3RcbiAqIEBwYXJhbSB7YW55fSBwa2dcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJucyB7c3RyaW5nIHwgdW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiBmaW5kRW50cnlGaWxlKHBrZzogRGVwLCBwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgY2xlYW5QYXRoID0gY2xlYW51cEVudHJ5UG9pbnRQYXRoKHBhdGgpO1xuICAvLyBjaGVjayBpZiBtYWluIGVudHJ5IHBvaW50IGV4aXN0c1xuICBjb25zdCBlbnRyeUZpbGUgPSBmaW5kRmlsZShwa2csIGNsZWFuUGF0aCkgfHwgZmluZEZpbGUocGtnLCBgJHtjbGVhblBhdGh9LmpzYCk7XG4gIGlmICghZW50cnlGaWxlKSB7XG4gICAgLy8gSWYgZW50cnlQb2ludCBlbnRyeSBwb2ludCBsaXN0ZWQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGEgZmlsZVxuICAgIC8vIFRoaXMgY2FuIGhhcHBlblxuICAgIC8vIGluIHNvbWUgbnBtIHBhY2thZ2VzIHRoYXQgbGlzdCBhbiBpbmNvcnJlY3QgbWFpbiBzdWNoIGFzIHY4LWNvdmVyYWdlQDEuMC44XG4gICAgLy8gd2hpY2ggbGlzdHMgYFwibWFpblwiOiBcImluZGV4LmpzXCJgIGJ1dCB0aGF0IGZpbGUgZG9lcyBub3QgZXhpc3QuXG4gICAgbG9nX3ZlcmJvc2UoXG4gICAgICAgIGBjb3VsZCBub3QgZmluZCBlbnRyeSBwb2ludCBmb3IgdGhlIHBhdGggJHtjbGVhblBhdGh9IGdpdmVuIGJ5IG5wbSBwYWNrYWdlICR7cGtnLl9uYW1lfWApO1xuICB9XG4gIHJldHVybiBlbnRyeUZpbGU7XG59XG5cbi8qKlxuICogVHJpZXMgdG8gcmVzb2x2ZSB0aGUgZW50cnlQb2ludCBmaWxlIGZyb20gdGhlIHBrZyBmb3IgYSBnaXZlbiBtYWluRmlsZU5hbWVcbiAqXG4gKiBAcGFyYW0ge2FueX0gcGtnXG4gKiBAcGFyYW0geydicm93c2VyJyB8ICdtb2R1bGUnIHwgJ21haW4nfSBtYWluRmlsZU5hbWVcbiAqIEByZXR1cm5zIHtzdHJpbmcgfCB1bmRlZmluZWR9IHRoZSBwYXRoIG9yIHVuZGVmaW5lZCBpZiB3ZSBjYW50IHJlc29sdmUgdGhlIGZpbGVcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZU1haW5GaWxlKHBrZzogRGVwLCBtYWluRmlsZU5hbWU6IHN0cmluZykge1xuICBjb25zdCBtYWluRW50cnlGaWVsZCA9IHBrZ1ttYWluRmlsZU5hbWVdO1xuXG4gIGlmIChtYWluRW50cnlGaWVsZCkge1xuICAgIGlmICh0eXBlb2YgbWFpbkVudHJ5RmllbGQgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZmluZEVudHJ5RmlsZShwa2csIG1haW5FbnRyeUZpZWxkKVxuXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWFpbkVudHJ5RmllbGQgPT09ICdvYmplY3QnICYmIG1haW5GaWxlTmFtZSA9PT0gJ2Jyb3dzZXInKSB7XG4gICAgICAvLyBicm93c2VyIGhhcyBhIHdlaXJkIHdheSBvZiBkZWZpbmluZyB0aGlzXG4gICAgICAvLyB0aGUgYnJvd3NlciB2YWx1ZSBpcyBhbiBvYmplY3QgbGlzdGluZyBmaWxlcyB0byBhbGlhcywgdXN1YWxseSBwb2ludGluZyB0byBhIGJyb3dzZXIgZGlyXG4gICAgICBjb25zdCBpbmRleEVudHJ5UG9pbnQgPSBtYWluRW50cnlGaWVsZFsnaW5kZXguanMnXSB8fCBtYWluRW50cnlGaWVsZFsnLi9pbmRleC5qcyddO1xuICAgICAgaWYgKGluZGV4RW50cnlQb2ludCkge1xuICAgICAgICByZXR1cm4gZmluZEVudHJ5RmlsZShwa2csIGluZGV4RW50cnlQb2ludClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBUcmllcyB0byByZXNvbHZlIHRoZSBtYWluRmlsZSBmcm9tIGEgZ2l2ZW4gcGtnXG4gKiBUaGlzIHVzZXMgc2V2ZWFsIG1haW5GaWxlTmFtZXMgaW4gcHJpb3JpdHkgdG8gZmluZCBhIGNvcnJlY3QgdXNhYmxlIGZpbGVcbiAqIEBwYXJhbSB7YW55fSBwa2dcbiAqIEByZXR1cm5zIHtzdHJpbmcgfCB1bmRlZmluZWR9XG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVQa2dNYWluRmlsZShwa2c6IERlcCkge1xuICAvLyBlczIwMTUgaXMgYW5vdGhlciBvcHRpb24gZm9yIG1haW5GaWxlIGhlcmVcbiAgLy8gYnV0IGl0cyB2ZXJ5IHVuY29tbW9uIGFuZCBpbSBub3Qgc3VyZSB3aGF0IHByaW9yaXR5IGl0IHRha2VzXG4gIC8vXG4gIC8vIHRoaXMgbGlzdCBpcyBvcmRlcmVkLCB3ZSB0cnkgcmVzb2x2ZSBgYnJvd3NlcmAgZmlyc3QsIHRoZW4gYG1vZHVsZWAgYW5kIGZpbmFsbHkgZmFsbCBiYWNrIHRvXG4gIC8vIGBtYWluYFxuICBjb25zdCBtYWluRmlsZU5hbWVzID0gWydicm93c2VyJywgJ21vZHVsZScsICdtYWluJ11cblxuICAgICAgZm9yIChjb25zdCBtYWluRmlsZSBvZiBtYWluRmlsZU5hbWVzKSB7XG4gICAgY29uc3QgcmVzb2x2ZWRNYWluRmlsZSA9IHJlc29sdmVNYWluRmlsZShwa2csIG1haW5GaWxlKTtcbiAgICBpZiAocmVzb2x2ZWRNYWluRmlsZSkge1xuICAgICAgcmV0dXJuIHJlc29sdmVkTWFpbkZpbGU7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgd2UgY2FudCBmaW5kIGFueSBjb3JyZWN0IGZpbGUgcmVmZXJlbmNlcyBmcm9tIHRoZSBwa2dcbiAgLy8gdGhlbiB3ZSBqdXN0IHRyeSBsb29raW5nIGFyb3VuZCBmb3IgY29tbW9uIHBhdHRlcm5zXG4gIGNvbnN0IG1heWJlUm9vdEluZGV4ID0gZmluZEVudHJ5RmlsZShwa2csICdpbmRleC5qcycpO1xuICBpZiAobWF5YmVSb290SW5kZXgpIHtcbiAgICByZXR1cm4gbWF5YmVSb290SW5kZXhcbiAgfVxuXG4gIGNvbnN0IG1heWJlU2VsZk5hbWVkSW5kZXggPSBmaW5kRW50cnlGaWxlKHBrZywgYCR7cGtnLl9uYW1lfS5qc2ApO1xuICBpZiAobWF5YmVTZWxmTmFtZWRJbmRleCkge1xuICAgIHJldHVybiBtYXliZVNlbGZOYW1lZEluZGV4O1xuICB9XG5cbiAgLy8gbm9uZSBvZiB0aGUgbWV0aG9kcyB3ZSB0cmllZCByZXN1bHRlZCBpbiBhIGZpbGVcbiAgbG9nX3ZlcmJvc2UoYGNvdWxkIG5vdCBmaW5kIGVudHJ5IHBvaW50IGZvciBucG0gcGFja2FnZSAke3BrZy5fbmFtZX1gKTtcblxuICAvLyBhdCB0aGlzIHBvaW50IHRoZXJlJ3Mgbm90aGluZyBsZWZ0IGZvciB1cyB0byB0cnksIHNvIHJldHVybiBub3RoaW5nXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbnR5cGUgQmFnPFQ+ID1cbiAgICB7XG4gICAgICBbazogc3RyaW5nXTogVFxuICAgIH1cblxuLyoqXG4gKiBGbGF0dGVucyBhbGwgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgb2YgYSBwYWNrYWdlXG4gKiBpbnRvIGEgX2RlcGVuZGVuY2llcyBhcnJheS5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlblBrZ0RlcGVuZGVuY2llcyhwa2c6IERlcCwgZGVwOiBEZXAsIHBrZ3NNYXA6IE1hcDxzdHJpbmcsIERlcD4sIHBlZXJEZXBzSGFuZGxpbmcgPSBQRUVSX0RFUFNfSEFORExJTkcpIHtcbiAgaWYgKHBrZy5fZGVwZW5kZW5jaWVzLmluZGV4T2YoZGVwKSAhPT0gLTEpIHtcbiAgICAvLyBjaXJjdWxhciBkZXBlbmRlbmN5XG4gICAgcmV0dXJuO1xuICB9XG4gIHBrZy5fZGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgY29uc3QgZmluZERlcHMgPSBmdW5jdGlvbih0YXJnZXREZXBzOiBCYWc8c3RyaW5nPiwgcmVxdWlyZWQ6IGJvb2xlYW4sIGRlcFR5cGU6IHN0cmluZykge1xuICAgIE9iamVjdC5rZXlzKHRhcmdldERlcHMgfHwge30pXG4gICAgICAgIC5tYXAodGFyZ2V0RGVwID0+IHtcbiAgICAgICAgICAvLyBsb29rIGZvciBtYXRjaGluZyBuZXN0ZWQgcGFja2FnZVxuICAgICAgICAgIGNvbnN0IGRpclNlZ21lbnRzID0gZGVwLl9kaXIuc3BsaXQoJy8nKTtcbiAgICAgICAgICB3aGlsZSAoZGlyU2VnbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBtYXliZSA9IHBhdGgucG9zaXguam9pbiguLi5kaXJTZWdtZW50cywgJ25vZGVfbW9kdWxlcycsIHRhcmdldERlcCk7XG4gICAgICAgICAgICBpZiAocGtnc01hcC5oYXMobWF5YmUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwa2dzTWFwLmdldChtYXliZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXJTZWdtZW50cy5wb3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gbG9vayBmb3IgbWF0Y2hpbmcgcm9vdCBwYWNrYWdlXG4gICAgICAgICAgaWYgKHBrZ3NNYXAuaGFzKHRhcmdldERlcCkpIHtcbiAgICAgICAgICAgIHJldHVybiBwa2dzTWFwLmdldCh0YXJnZXREZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBkZXBlbmRlbmN5IG5vdCBmb3VuZFxuICAgICAgICAgIGlmIChyZXF1aXJlZCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgY291bGQgbm90IGZpbmQgJHtkZXBUeXBlfSAnJHt0YXJnZXREZXB9JyBvZiAnJHtkZXAuX2Rpcn0nYCk7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKGRlcCA9PiAhIWRlcClcbiAgICAgICAgLmZvckVhY2goZGVwID0+IGZsYXR0ZW5Qa2dEZXBlbmRlbmNpZXMocGtnLCBkZXAhLCBwa2dzTWFwLCBwZWVyRGVwc0hhbmRsaW5nKSk7XG4gIH07XG4gIC8vIG5wbSB3aWxsIGluIHNvbWUgY2FzZXMgYWRkIG9wdGlvbmFsRGVwZW5kZW5jaWVzIHRvIHRoZSBsaXN0XG4gIC8vIG9mIGRlcGVuZGVuY2llcyB0byB0aGUgcGFja2FnZS5qc29uIGl0IHdyaXRlcyB0byBub2RlX21vZHVsZXMuXG4gIC8vIFdlIGRlbGV0ZSB0aGVzZSBoZXJlIGlmIHRoZXkgZXhpc3QgYXMgdGhleSBtYXkgcmVzdWx0XG4gIC8vIGluIGV4cGVjdGVkIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBub3QgZm91bmQuXG4gIGlmIChkZXAuZGVwZW5kZW5jaWVzICYmIGRlcC5vcHRpb25hbERlcGVuZGVuY2llcykge1xuICAgIE9iamVjdC5rZXlzKGRlcC5vcHRpb25hbERlcGVuZGVuY2llcykuZm9yRWFjaChvcHRpb25hbERlcCA9PiB7XG4gICAgICBkZWxldGUgZGVwLmRlcGVuZGVuY2llc1tvcHRpb25hbERlcF07XG4gICAgfSk7XG4gIH1cblxuICBmaW5kRGVwcyhkZXAuZGVwZW5kZW5jaWVzLCB0cnVlLCAnZGVwZW5kZW5jeScpO1xuICBmaW5kRGVwcyhkZXAucGVlckRlcGVuZGVuY2llcywgcGVlckRlcHNIYW5kbGluZyA9PT0gJ2lnbm9yZScgPyBmYWxzZSA6IHRydWUsICdwZWVyIGRlcGVuZGVuY3knKTtcbiAgLy8gYG9wdGlvbmFsRGVwZW5kZW5jaWVzYCB0aGF0IGFyZSBtaXNzaW5nIHNob3VsZCBiZSBzaWxlbnRseVxuICAvLyBpZ25vcmVkIHNpbmNlIHRoZSBucG0veWFybiB3aWxsIG5vdCBmYWlsIGlmIHRoZXNlIGRlcGVuZGVuY2llc1xuICAvLyBmYWlsIHRvIGluc3RhbGwuIFBhY2thZ2VzIHNob3VsZCBoYW5kbGUgdGhlIGNhc2VzIHdoZXJlIHRoZXNlXG4gIC8vIGRlcGVuZGVuY2llcyBhcmUgbWlzc2luZyBncmFjZWZ1bGx5IGF0IHJ1bnRpbWUuXG4gIC8vIEFuIGV4YW1wbGUgb2YgdGhpcyBpcyB0aGUgYGNob2tpZGFyYCBwYWNrYWdlIHdoaWNoIHNwZWNpZmllc1xuICAvLyBgZnNldmVudHNgIGFzIGFuIG9wdGlvbmFsRGVwZW5kZW5jeS4gT24gT1NYLCBgZnNldmVudHNgXG4gIC8vIGlzIGluc3RhbGxlZCBzdWNjZXNzZnVsbHksIGJ1dCBvbiBXaW5kb3dzICYgTGludXgsIGBmc2V2ZW50c2BcbiAgLy8gZmFpbHMgdG8gaW5zdGFsbCBhbmQgdGhlIHBhY2thZ2Ugd2lsbCBub3QgYmUgcHJlc2VudCB3aGVuXG4gIC8vIGNoZWNraW5nIHRoZSBkZXBlbmRlbmNpZXMgb2YgYGNob2tpZGFyYC5cbiAgZmluZERlcHMoZGVwLm9wdGlvbmFsRGVwZW5kZW5jaWVzLCBmYWxzZSwgJ29wdGlvbmFsIGRlcGVuZGVuY3knKTtcbn1cblxuLyoqXG4gKiBSZWZvcm1hdC9wcmV0dHktcHJpbnQgYSBqc29uIG9iamVjdCBhcyBhIHNreWxhcmsgY29tbWVudCAoZWFjaCBsaW5lXG4gKiBzdGFydHMgd2l0aCAnIyAnKS5cbiAqL1xuZnVuY3Rpb24gcHJpbnRKc29uKHBrZzogRGVwKSB7XG4gIC8vIENsb25lIGFuZCBtb2RpZnkgX2RlcGVuZGVuY2llcyB0byBhdm9pZCBjaXJjdWxhciBpc3N1ZXMgd2hlbiBKU09OaWZ5aW5nXG4gIC8vICYgZGVsZXRlIF9maWxlcyBhcnJheVxuICBjb25zdCBjbG9uZWQ6IGFueSA9IHsuLi5wa2d9O1xuICBjbG9uZWQuX2RlcGVuZGVuY2llcyA9IHBrZy5fZGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gZGVwLl9kaXIpO1xuICBkZWxldGUgY2xvbmVkLl9maWxlcztcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGNsb25lZCwgbnVsbCwgMikuc3BsaXQoJ1xcbicpLm1hcChsaW5lID0+IGAjICR7bGluZX1gKS5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBBIGZpbHRlciBmdW5jdGlvbiBmb3IgZmlsZXMgaW4gYW4gbnBtIHBhY2thZ2UuIENvbXBhcmlzb24gaXMgY2FzZS1pbnNlbnNpdGl2ZS5cbiAqIEBwYXJhbSBmaWxlcyBhcnJheSBvZiBmaWxlcyB0byBmaWx0ZXJcbiAqIEBwYXJhbSBleHRzIGxpc3Qgb2Ygd2hpdGUgbGlzdGVkIGNhc2UtaW5zZW5zaXRpdmUgZXh0ZW5zaW9uczsgaWYgZW1wdHksIG5vIGZpbHRlciBpc1xuICogICAgICAgICAgICAgZG9uZSBvbiBleHRlbnNpb25zOyAnJyBlbXB0eSBzdHJpbmcgZGVub3RlcyB0byBhbGxvdyBmaWxlcyB3aXRoIG5vIGV4dGVuc2lvbnMsXG4gKiAgICAgICAgICAgICBvdGhlciBleHRlbnNpb25zIGFyZSBsaXN0ZWQgd2l0aCAnLmV4dCcgbm90YXRpb24gc3VjaCBhcyAnLmQudHMnLlxuICovXG5mdW5jdGlvbiBmaWx0ZXJGaWxlcyhmaWxlczogc3RyaW5nW10sIGV4dHM6IHN0cmluZ1tdID0gW10pIHtcbiAgaWYgKGV4dHMubGVuZ3RoKSB7XG4gICAgY29uc3QgYWxsb3dOb0V4dHMgPSBleHRzLmluY2x1ZGVzKCcnKTtcbiAgICBmaWxlcyA9IGZpbGVzLmZpbHRlcihmID0+IHtcbiAgICAgIC8vIGluY2x1ZGUgZmlsZXMgd2l0aCBubyBleHRlbnNpb25zIGlmIG5vRXh0IGlzIHRydWVcbiAgICAgIGlmIChhbGxvd05vRXh0cyAmJiAhcGF0aC5leHRuYW1lKGYpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIC8vIGZpbHRlciBmaWxlcyBpbiBleHRzXG4gICAgICBjb25zdCBsYyA9IGYudG9Mb3dlckNhc2UoKTtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBleHRzKSB7XG4gICAgICAgIGlmIChlICYmIGxjLmVuZHNXaXRoKGUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pXG4gIH1cbiAgLy8gRmlsdGVyIG91dCBCVUlMRCBmaWxlcyB0aGF0IGNhbWUgd2l0aCB0aGUgbnBtIHBhY2thZ2VcbiAgcmV0dXJuIGZpbGVzLmZpbHRlcihmaWxlID0+IHtcbiAgICBjb25zdCBiYXNlbmFtZVVjID0gcGF0aC5iYXNlbmFtZShmaWxlKS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChiYXNlbmFtZVVjID09PSAnX0JVSUxEJyB8fCBiYXNlbmFtZVVjID09PSAnX0JVSUxELkJBWkVMJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBzcGVjaWZpZWQgYHBrZ2AgY29uZm9ybXMgdG8gQW5ndWxhciBQYWNrYWdlIEZvcm1hdCAoQVBGKSxcbiAqIGZhbHNlIG90aGVyd2lzZS4gSWYgdGhlIHBhY2thZ2UgY29udGFpbnMgYCoubWV0YWRhdGEuanNvbmAgYW5kIGFcbiAqIGNvcnJlc3BvbmRpbmcgc2libGluZyBgLmQudHNgIGZpbGUsIHRoZW4gdGhlIHBhY2thZ2UgaXMgY29uc2lkZXJlZCB0byBiZSBBUEYuXG4gKi9cbmZ1bmN0aW9uIGlzTmdBcGZQYWNrYWdlKHBrZzogRGVwKSB7XG4gIGNvbnN0IHNldCA9IG5ldyBTZXQocGtnLl9maWxlcyk7XG4gIGlmIChzZXQuaGFzKCdBTkdVTEFSX1BBQ0tBR0UnKSkge1xuICAgIC8vIFRoaXMgZmlsZSBpcyB1c2VkIGJ5IHRoZSBucG0veWFybl9pbnN0YWxsIHJ1bGUgdG8gZGV0ZWN0IEFQRi4gU2VlXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy85MjdcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBjb25zdCBtZXRhZGF0YUV4dCA9IC9cXC5tZXRhZGF0YVxcLmpzb24kLztcbiAgcmV0dXJuIHBrZy5fZmlsZXMuc29tZSgoZmlsZSkgPT4ge1xuICAgIGlmIChtZXRhZGF0YUV4dC50ZXN0KGZpbGUpKSB7XG4gICAgICBjb25zdCBzaWJsaW5nID0gZmlsZS5yZXBsYWNlKG1ldGFkYXRhRXh0LCAnLmQudHMnKTtcbiAgICAgIGlmIChzZXQuaGFzKHNpYmxpbmcpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufVxuXG4vKipcbiAqIElmIHRoZSBwYWNrYWdlIGlzIGluIHRoZSBBbmd1bGFyIHBhY2thZ2UgZm9ybWF0IHJldHVybnMgbGlzdFxuICogb2YgcGFja2FnZSBmaWxlcyB0aGF0IGVuZCB3aXRoIGAudW1kLmpzYCwgYC5uZ2ZhY3RvcnkuanNgIGFuZCBgLm5nc3VtbWFyeS5qc2AuXG4gKi9cbmZ1bmN0aW9uIGdldE5nQXBmU2NyaXB0cyhwa2c6IERlcCkge1xuICByZXR1cm4gaXNOZ0FwZlBhY2thZ2UocGtnKSA/XG4gICAgICBmaWx0ZXJGaWxlcyhwa2cuX2ZpbGVzLCBbJy51bWQuanMnLCAnLm5nZmFjdG9yeS5qcycsICcubmdzdW1tYXJ5LmpzJ10pIDpcbiAgICAgIFtdO1xufVxuXG4vKipcbiAqIExvb2tzIGZvciBhIGZpbGUgd2l0aGluIGEgcGFja2FnZSBhbmQgcmV0dXJucyBpdCBpZiBmb3VuZC5cbiAqL1xuZnVuY3Rpb24gZmluZEZpbGUocGtnOiBEZXAsIG06IHN0cmluZykge1xuICBjb25zdCBtbCA9IG0udG9Mb3dlckNhc2UoKTtcbiAgZm9yIChjb25zdCBmIG9mIHBrZy5fZmlsZXMpIHtcbiAgICBpZiAoZi50b0xvd2VyQ2FzZSgpID09PSBtbCkge1xuICAgICAgcmV0dXJuIGY7XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBwa2csIHJldHVybiB0aGUgc2t5bGFyayBgbm9kZV9tb2R1bGVfbGlicmFyeWAgdGFyZ2V0cyBmb3IgdGhlIHBhY2thZ2UuXG4gKi9cbmZ1bmN0aW9uIHByaW50UGFja2FnZShwa2c6IERlcCkge1xuICBjb25zdCBzb3VyY2VzID0gZmlsdGVyRmlsZXMocGtnLl9maWxlcywgSU5DTFVERURfRklMRVMpO1xuICBjb25zdCBkdHNTb3VyY2VzID0gZmlsdGVyRmlsZXMocGtnLl9maWxlcywgWycuZC50cyddKTtcbiAgLy8gVE9ETyhnbWFnb2xhbik6IGFkZCBVTUQgJiBBTUQgc2NyaXB0cyB0byBzY3JpcHRzIGV2ZW4gaWYgbm90IGFuIEFQRiBwYWNrYWdlIF9idXRfIG9ubHkgaWYgdGhleVxuICAvLyBhcmUgbmFtZWQ/XG4gIGNvbnN0IHNjcmlwdHMgPSBnZXROZ0FwZlNjcmlwdHMocGtnKTtcbiAgY29uc3QgZGVwcyA9IFtwa2ddLmNvbmNhdChwa2cuX2RlcGVuZGVuY2llcy5maWx0ZXIoZGVwID0+IGRlcCAhPT0gcGtnICYmICFkZXAuX2lzTmVzdGVkKSk7XG5cbiAgbGV0IHNjcmlwdFN0YXJsYXJrID0gJyc7XG4gIGlmIChzY3JpcHRzLmxlbmd0aCkge1xuICAgIHNjcmlwdFN0YXJsYXJrID0gYFxuICAgICMgc3Vic2V0IG9mIHNyY3MgdGhhdCBhcmUgamF2YXNjcmlwdCBuYW1lZC1VTUQgb3IgbmFtZWQtQU1EIHNjcmlwdHNcbiAgICBzY3JpcHRzID0gW1xuICAgICAgICAke3NjcmlwdHMubWFwKChmOiBzdHJpbmcpID0+IGBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke2Z9XCIsYCkuam9pbignXFxuICAgICAgICAnKX1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgc3Jjc1N0YXJsYXJrID0gJyc7XG4gIGlmIChzb3VyY2VzLmxlbmd0aCkge1xuICAgIHNyY3NTdGFybGFyayA9IGBcbiAgICAjICR7cGtnLl9kaXJ9IHBhY2thZ2UgZmlsZXMgKGFuZCBmaWxlcyBpbiBuZXN0ZWQgbm9kZV9tb2R1bGVzKVxuICAgIHNyY3MgPSBbXG4gICAgICAgICR7c291cmNlcy5tYXAoKGY6IHN0cmluZykgPT4gYFwiLy86bm9kZV9tb2R1bGVzLyR7cGtnLl9kaXJ9LyR7Zn1cIixgKS5qb2luKCdcXG4gICAgICAgICcpfVxuICAgIF0sYDtcbiAgfVxuXG4gIGxldCBkZXBzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGRlcHMubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IGRlcHMubWFwKGRlcCA9PiBgXCIvLyR7ZGVwLl9kaXJ9OiR7ZGVwLl9uYW1lfV9fY29udGVudHNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIGRlcHNTdGFybGFyayA9IGBcbiAgICAjIGZsYXR0ZW5lZCBsaXN0IG9mIGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgaG9pc3RlZCB0byByb290IGJ5IHRoZSBwYWNrYWdlIG1hbmFnZXJcbiAgICBkZXBzID0gW1xuICAgICAgICAke2xpc3R9XG4gICAgXSxgO1xuICB9XG5cbiAgbGV0IGR0c1N0YXJsYXJrID0gJyc7XG4gIGlmIChkdHNTb3VyY2VzLmxlbmd0aCkge1xuICAgIGR0c1N0YXJsYXJrID0gYFxuICAgICMgJHtwa2cuX2Rpcn0gcGFja2FnZSBkZWNsYXJhdGlvbiBmaWxlcyAoYW5kIGRlY2xhcmF0aW9uIGZpbGVzIGluIG5lc3RlZCBub2RlX21vZHVsZXMpXG4gICAgc3JjcyA9IFtcbiAgICAgICAgJHtkdHNTb3VyY2VzLm1hcChmID0+IGBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke2Z9XCIsYCkuam9pbignXFxuICAgICAgICAnKX1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgcmVzdWx0ID1cbiAgICAgIGBsb2FkKFwiQGJ1aWxkX2JhemVsX3J1bGVzX25vZGVqcy8vaW50ZXJuYWwvbnBtX2luc3RhbGw6bm9kZV9tb2R1bGVfbGlicmFyeS5iemxcIiwgXCJub2RlX21vZHVsZV9saWJyYXJ5XCIpXG5cbiMgR2VuZXJhdGVkIHRhcmdldHMgZm9yIG5wbSBwYWNrYWdlIFwiJHtwa2cuX2Rpcn1cIlxuJHtwcmludEpzb24ocGtnKX1cblxuZmlsZWdyb3VwKFxuICAgIG5hbWUgPSBcIiR7cGtnLl9uYW1lfV9fZmlsZXNcIiwke3NyY3NTdGFybGFya31cbilcblxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1cIixcbiAgICAjIGRpcmVjdCBzb3VyY2VzIGxpc3RlZCBmb3Igc3RyaWN0IGRlcHMgc3VwcG9ydFxuICAgIHNyY3MgPSBbXCI6JHtwa2cuX25hbWV9X19maWxlc1wiXSwke2RlcHNTdGFybGFya31cbilcblxuIyAke3BrZy5fbmFtZX1fX2NvbnRlbnRzIHRhcmdldCBpcyB1c2VkIGFzIGRlcCBmb3IgbWFpbiB0YXJnZXRzIHRvIHByZXZlbnRcbiMgY2lyY3VsYXIgZGVwZW5kZW5jaWVzIGVycm9yc1xubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1fX2NvbnRlbnRzXCIsXG4gICAgc3JjcyA9IFtcIjoke3BrZy5fbmFtZX1fX2ZpbGVzXCJdLCR7c2NyaXB0U3Rhcmxhcmt9XG4pXG5cbiMgJHtwa2cuX25hbWV9X190eXBpbmdzIGlzIHRoZSBzdWJzZXQgb2YgJHtwa2cuX25hbWV9X19jb250ZW50cyB0aGF0IGFyZSBkZWNsYXJhdGlvbnNcbm5vZGVfbW9kdWxlX2xpYnJhcnkoXG4gICAgbmFtZSA9IFwiJHtwa2cuX25hbWV9X190eXBpbmdzXCIsJHtkdHNTdGFybGFya31cbilcblxuYDtcblxuICBsZXQgbWFpbkVudHJ5UG9pbnQgPSByZXNvbHZlUGtnTWFpbkZpbGUocGtnKVxuXG4gIC8vIGFkZCBhbiBgbnBtX3VtZF9idW5kbGVgIHRhcmdldCB0byBnZW5lcmF0ZSBhbiBVTUQgYnVuZGxlIGlmIG9uZSBkb2VzXG4gIC8vIG5vdCBleGlzdHNcbiAgaWYgKG1haW5FbnRyeVBvaW50ICYmICFmaW5kRmlsZShwa2csIGAke3BrZy5fbmFtZX0udW1kLmpzYCkpIHtcbiAgICByZXN1bHQgKz1cbiAgICAgICAgYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy9pbnRlcm5hbC9ucG1faW5zdGFsbDpucG1fdW1kX2J1bmRsZS5iemxcIiwgXCJucG1fdW1kX2J1bmRsZVwiKVxuXG5ucG1fdW1kX2J1bmRsZShcbiAgICBuYW1lID0gXCIke3BrZy5fbmFtZX1fX3VtZFwiLFxuICAgIHBhY2thZ2VfbmFtZSA9IFwiJHtwa2cuX25hbWV9XCIsXG4gICAgZW50cnlfcG9pbnQgPSBcIi8vOm5vZGVfbW9kdWxlcy8ke3BrZy5fZGlyfS8ke21haW5FbnRyeVBvaW50fVwiLFxuICAgIHBhY2thZ2UgPSBcIjoke3BrZy5fbmFtZX1cIixcbilcblxuYDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIF9maW5kRXhlY3V0YWJsZXMocGtnOiBEZXApIHtcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBuZXcgTWFwKCk7XG5cbiAgLy8gRm9yIHJvb3QgcGFja2FnZXMsIHRyYW5zZm9ybSB0aGUgcGtnLmJpbiBlbnRyaWVzXG4gIC8vIGludG8gYSBuZXcgTWFwIGNhbGxlZCBfZXhlY3V0YWJsZXNcbiAgLy8gTk9URTogd2UgZG8gdGhpcyBvbmx5IGZvciBub24tZW1wdHkgYmluIHBhdGhzXG4gIGlmIChpc1ZhbGlkQmluUGF0aChwa2cuYmluKSkge1xuICAgIGlmICghcGtnLl9pc05lc3RlZCkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGtnLmJpbikpIHtcbiAgICAgICAgaWYgKHBrZy5iaW4ubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBleGVjdXRhYmxlcy5zZXQocGtnLl9kaXIsIGNsZWFudXBCaW5QYXRoKHBrZy5iaW5bMF0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzaG91bGQgbm90IGhhcHBlbiwgYnV0IGlnbm9yZSBpdCBpZiBwcmVzZW50XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBrZy5iaW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGV4ZWN1dGFibGVzLnNldChwa2cuX2RpciwgY2xlYW51cEJpblBhdGgocGtnLmJpbikpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGtnLmJpbiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHBrZy5iaW4pIHtcbiAgICAgICAgICBpZiAoaXNWYWxpZEJpblBhdGhTdHJpbmdWYWx1ZShwa2cuYmluW2tleV0pKSB7XG4gICAgICAgICAgICBleGVjdXRhYmxlcy5zZXQoa2V5LCBjbGVhbnVwQmluUGF0aChwa2cuYmluW2tleV0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZXhlY3V0YWJsZXM7XG59XG5cbi8vIEhhbmRsZSBhZGRpdGlvbmFsQXR0cmlidXRlcyBvZiBmb3JtYXQ6XG4vLyBgYGBcbi8vIFwiYmF6ZWxCaW5cIjoge1xuLy8gICBcIm5nYy13cmFwcGVkXCI6IHtcbi8vICAgICBcImFkZGl0aW9uYWxBdHRyaWJ1dGVzXCI6IHtcbi8vICAgICAgIFwiY29uZmlndXJhdGlvbl9lbnZfdmFyc1wiOiBcIltcXFwiY29tcGlsZVxcXCJdXCJcbi8vICAgfVxuLy8gfSxcbi8vIGBgYFxuZnVuY3Rpb24gYWRkaXRpb25hbEF0dHJpYnV0ZXMocGtnOiBEZXAsIG5hbWU6IHN0cmluZykge1xuICBsZXQgYWRkaXRpb25hbEF0dHJpYnV0ZXMgPSAnJztcbiAgaWYgKHBrZy5iYXplbEJpbiAmJiBwa2cuYmF6ZWxCaW5bbmFtZV0gJiYgcGtnLmJhemVsQmluW25hbWVdLmFkZGl0aW9uYWxBdHRyaWJ1dGVzKSB7XG4gICAgY29uc3QgYXR0cnMgPSBwa2cuYmF6ZWxCaW5bbmFtZV0uYWRkaXRpb25hbEF0dHJpYnV0ZXM7XG4gICAgZm9yIChjb25zdCBhdHRyTmFtZSBvZiBPYmplY3Qua2V5cyhhdHRycykpIHtcbiAgICAgIGNvbnN0IGF0dHJWYWx1ZSA9IGF0dHJzW2F0dHJOYW1lXTtcbiAgICAgIGFkZGl0aW9uYWxBdHRyaWJ1dGVzICs9IGBcXG4gICAgJHthdHRyTmFtZX0gPSAke2F0dHJWYWx1ZX0sYDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFkZGl0aW9uYWxBdHRyaWJ1dGVzO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgcGtnLCByZXR1cm4gdGhlIHNreWxhcmsgbm9kZWpzX2JpbmFyeSB0YXJnZXRzIGZvciB0aGUgcGFja2FnZS5cbiAqL1xuZnVuY3Rpb24gcHJpbnRQYWNrYWdlQmluKHBrZzogRGVwKSB7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBfZmluZEV4ZWN1dGFibGVzKHBrZyk7XG4gIGlmIChleGVjdXRhYmxlcy5zaXplKSB7XG4gICAgcmVzdWx0ID0gYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy86aW5kZXguYnpsXCIsIFwibm9kZWpzX2JpbmFyeVwiKVxuXG5gO1xuICAgIGNvbnN0IGRhdGEgPSBbYC8vJHtwa2cuX2Rpcn06JHtwa2cuX25hbWV9YF07XG4gICAgaWYgKHBrZy5fZHluYW1pY0RlcGVuZGVuY2llcykge1xuICAgICAgZGF0YS5wdXNoKC4uLnBrZy5fZHluYW1pY0RlcGVuZGVuY2llcyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgcGF0aF0gb2YgZXhlY3V0YWJsZXMuZW50cmllcygpKSB7XG4gICAgICByZXN1bHQgKz0gYCMgV2lyZSB1cCB0aGUgXFxgYmluXFxgIGVudHJ5IFxcYCR7bmFtZX1cXGBcbm5vZGVqc19iaW5hcnkoXG4gICAgbmFtZSA9IFwiJHtuYW1lfVwiLFxuICAgIGVudHJ5X3BvaW50ID0gXCIvLzpub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtwYXRofVwiLFxuICAgIGluc3RhbGxfc291cmNlX21hcF9zdXBwb3J0ID0gRmFsc2UsXG4gICAgZGF0YSA9IFske2RhdGEubWFwKHAgPT4gYFwiJHtwfVwiYCkuam9pbignLCAnKX1dLCR7YWRkaXRpb25hbEF0dHJpYnV0ZXMocGtnLCBuYW1lKX1cbilcblxuYDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBwcmludEluZGV4QnpsKHBrZzogRGVwKSB7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgY29uc3QgZXhlY3V0YWJsZXMgPSBfZmluZEV4ZWN1dGFibGVzKHBrZyk7XG4gIGlmIChleGVjdXRhYmxlcy5zaXplKSB7XG4gICAgcmVzdWx0ID0gYGxvYWQoXCJAYnVpbGRfYmF6ZWxfcnVsZXNfbm9kZWpzLy86aW5kZXguYnpsXCIsIFwibm9kZWpzX2JpbmFyeVwiLCBcIm5wbV9wYWNrYWdlX2JpblwiKVxuXG5gO1xuICAgIGNvbnN0IGRhdGEgPSBbYEAke1dPUktTUEFDRX0vLyR7cGtnLl9kaXJ9OiR7cGtnLl9uYW1lfWBdO1xuICAgIGlmIChwa2cuX2R5bmFtaWNEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGRhdGEucHVzaCguLi5wa2cuX2R5bmFtaWNEZXBlbmRlbmNpZXMpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIHBhdGhdIG9mIGV4ZWN1dGFibGVzLmVudHJpZXMoKSkge1xuICAgICAgcmVzdWx0ID0gYCR7cmVzdWx0fVxuXG4jIEdlbmVyYXRlZCBoZWxwZXIgbWFjcm8gdG8gY2FsbCAke25hbWV9XG5kZWYgJHtuYW1lLnJlcGxhY2UoLy0vZywgJ18nKX0oKiprd2FyZ3MpOlxuICAgIG91dHB1dF9kaXIgPSBrd2FyZ3MucG9wKFwib3V0cHV0X2RpclwiLCBGYWxzZSlcbiAgICBpZiBcIm91dHNcIiBpbiBrd2FyZ3Mgb3Igb3V0cHV0X2RpcjpcbiAgICAgICAgbnBtX3BhY2thZ2VfYmluKHRvb2wgPSBcIkAke1dPUktTUEFDRX0vLyR7cGtnLl9kaXJ9L2Jpbjoke1xuICAgICAgICAgIG5hbWV9XCIsIG91dHB1dF9kaXIgPSBvdXRwdXRfZGlyLCAqKmt3YXJncylcbiAgICBlbHNlOlxuICAgICAgICBub2RlanNfYmluYXJ5KFxuICAgICAgICAgICAgZW50cnlfcG9pbnQgPSBcIkAke1dPUktTUEFDRX0vLzpub2RlX21vZHVsZXMvJHtwa2cuX2Rpcn0vJHtwYXRofVwiLFxuICAgICAgICAgICAgaW5zdGFsbF9zb3VyY2VfbWFwX3N1cHBvcnQgPSBGYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBbJHtkYXRhLm1hcChwID0+IGBcIiR7cH1cImApLmpvaW4oJywgJyl9XSArIGt3YXJncy5wb3AoXCJkYXRhXCIsIFtdKSwke1xuICAgICAgICAgIGFkZGl0aW9uYWxBdHRyaWJ1dGVzKHBrZywgbmFtZSl9XG4gICAgICAgICAgICAqKmt3YXJnc1xuICAgICAgICApXG4gIGA7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbnR5cGUgRGVwID0ge1xuICBfZGlyOiBzdHJpbmcsXG4gIF9pc05lc3RlZDogYm9vbGVhbixcbiAgX2RlcGVuZGVuY2llczogRGVwW10sXG4gIF9maWxlczogc3RyaW5nW10sXG4gIFtrOiBzdHJpbmddOiBhbnlcbn1cblxuLyoqXG4gKiBHaXZlbiBhIHNjb3BlLCByZXR1cm4gdGhlIHNreWxhcmsgYG5vZGVfbW9kdWxlX2xpYnJhcnlgIHRhcmdldCBmb3IgdGhlIHNjb3BlLlxuICovXG5mdW5jdGlvbiBwcmludFNjb3BlKHNjb3BlOiBzdHJpbmcsIHBrZ3M6IERlcFtdKSB7XG4gIHBrZ3MgPSBwa2dzLmZpbHRlcihwa2cgPT4gIXBrZy5faXNOZXN0ZWQgJiYgcGtnLl9kaXIuc3RhcnRzV2l0aChgJHtzY29wZX0vYCkpO1xuICBsZXQgZGVwczogRGVwW10gPSBbXTtcbiAgcGtncy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgZGVwcyA9IGRlcHMuY29uY2F0KHBrZy5fZGVwZW5kZW5jaWVzLmZpbHRlcihkZXAgPT4gIWRlcC5faXNOZXN0ZWQgJiYgIXBrZ3MuaW5jbHVkZXMocGtnKSkpO1xuICB9KTtcbiAgLy8gZmlsdGVyIG91dCBkdXBsaWNhdGUgZGVwc1xuICBkZXBzID0gWy4uLnBrZ3MsIC4uLm5ldyBTZXQoZGVwcyldO1xuXG4gIGxldCBzcmNzU3RhcmxhcmsgPSAnJztcbiAgaWYgKGRlcHMubGVuZ3RoKSB7XG4gICAgY29uc3QgbGlzdCA9IGRlcHMubWFwKGRlcCA9PiBgXCIvLyR7ZGVwLl9kaXJ9OiR7ZGVwLl9uYW1lfV9fZmlsZXNcIixgKS5qb2luKCdcXG4gICAgICAgICcpO1xuICAgIHNyY3NTdGFybGFyayA9IGBcbiAgICAjIGRpcmVjdCBzb3VyY2VzIGxpc3RlZCBmb3Igc3RyaWN0IGRlcHMgc3VwcG9ydFxuICAgIHNyY3MgPSBbXG4gICAgICAgICR7bGlzdH1cbiAgICBdLGA7XG4gIH1cblxuICBsZXQgZGVwc1N0YXJsYXJrID0gJyc7XG4gIGlmIChkZXBzLmxlbmd0aCkge1xuICAgIGNvbnN0IGxpc3QgPSBkZXBzLm1hcChkZXAgPT4gYFwiLy8ke2RlcC5fZGlyfToke2RlcC5fbmFtZX1fX2NvbnRlbnRzXCIsYCkuam9pbignXFxuICAgICAgICAnKTtcbiAgICBkZXBzU3RhcmxhcmsgPSBgXG4gICAgIyBmbGF0dGVuZWQgbGlzdCBvZiBkaXJlY3QgYW5kIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIGhvaXN0ZWQgdG8gcm9vdCBieSB0aGUgcGFja2FnZSBtYW5hZ2VyXG4gICAgZGVwcyA9IFtcbiAgICAgICAgJHtsaXN0fVxuICAgIF0sYDtcbiAgfVxuXG4gIHJldHVybiBgbG9hZChcIkBidWlsZF9iYXplbF9ydWxlc19ub2RlanMvL2ludGVybmFsL25wbV9pbnN0YWxsOm5vZGVfbW9kdWxlX2xpYnJhcnkuYnpsXCIsIFwibm9kZV9tb2R1bGVfbGlicmFyeVwiKVxuXG4jIEdlbmVyYXRlZCB0YXJnZXQgZm9yIG5wbSBzY29wZSAke3Njb3BlfVxubm9kZV9tb2R1bGVfbGlicmFyeShcbiAgICBuYW1lID0gXCIke3Njb3BlfVwiLCR7c3Jjc1N0YXJsYXJrfSR7ZGVwc1N0YXJsYXJrfVxuKVxuXG5gO1xufVxuIl19