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


import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function log_verbose(...m: any[]) {
  if (!!process.env['VERBOSE_LOGS']) console.error('[generate_build_file.ts]', ...m);
}

const BUILD_FILE_HEADER = `# Generated file from yarn_install/npm_install rule.
# See rules_nodejs/internal/npm_install/generate_build_file.ts

# All rules in other repositories can use these targets
package(default_visibility = ["//visibility:public"])

`

const args = process.argv.slice(2);
const WORKSPACE = args[0];
const RULE_TYPE = args[1];
const LOCK_FILE_PATH = args[2];
const INCLUDED_FILES = args[3] ? args[3].split(',') : [];
const BAZEL_VERSION = args[4];

if (require.main === module) {
  main();
}

/**
 * Create a new directory and any necessary subdirectories
 * if they do not exist.
 */
function mkdirp(p: string) {
  if (!fs.existsSync(p)) {
    mkdirp(path.dirname(p));
    fs.mkdirSync(p);
  }
}

/**
 * Writes a file, first ensuring that the directory to
 * write to exists.
 */
function writeFileSync(p: string, content: string) {
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content);
}

/**
 * Main entrypoint.
 */
export function main() {
  // find all packages (including packages in nested node_modules)
  const pkgs = findPackages();

  // flatten dependencies
  flattenDependencies(pkgs);

  // generate Bazel workspaces
  generateBazelWorkspaces(pkgs)

  // generate all BUILD files
  generateBuildFiles(pkgs)

  // write a .bazelignore file
  writeFileSync('.bazelignore', 'node_modules');
}

/**
 * Generates all build files
 */
function generateBuildFiles(pkgs: Dep[]) {
  generateRootBuildFile(pkgs.filter(pkg => !pkg._isNested))
  pkgs.filter(pkg => !pkg._isNested).forEach(pkg => generatePackageBuildFiles(pkg));
  findScopes().forEach(scope => generateScopeBuildFiles(scope, pkgs));
}

/**
 * Flattens dependencies on all packages
 */
function flattenDependencies(pkgs: Dep[]) {
  const pkgsMap = new Map();
  pkgs.forEach(pkg => pkgsMap.set(pkg._dir, pkg));
  pkgs.forEach(pkg => flattenPkgDependencies(pkg, pkg, pkgsMap));
}

/**
 * Generates the root BUILD file.
 */
function generateRootBuildFile(pkgs: Dep[]) {
  let pkgFilesStarlark = '';
  if (pkgs.length) {
    const list = pkgs.map(pkg => `"//${pkg._dir}:${pkg._name}__files",
        "//${pkg._dir}:${pkg._name}__nested_node_modules",`)
                     .join('\n        ');
    pkgFilesStarlark = `
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

  let exportsStarlark = '';
  pkgs.forEach(pkg => {pkg._files.forEach(f => {
                 exportsStarlark += `    "node_modules/${pkg._dir}/${f}",
`;
               })});

  let buildFile = BUILD_FILE_HEADER +
      `load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

exports_files([
${exportsStarlark}])

# The node_modules directory in one catch-all node_module_library.
# NB: Using this target may have bad performance implications if
# there are many files in target.
# See https://github.com/bazelbuild/bazel/issues/5153.
node_module_library(
    name = "node_modules",${pkgFilesStarlark}${depsStarlark}
)

`

  // Add the manual build file contents if they exists
  try {
    buildFile += fs.readFileSync(`manual_build_file_contents`, {encoding: 'utf8'});
  } catch (e) {
  }

  writeFileSync('BUILD.bazel', buildFile);
}

/**
 * Generates all BUILD & bzl files for a package.
 */
function generatePackageBuildFiles(pkg: Dep) {
  // If a BUILD file was shipped with the package, append its contents to the end of
  // what we generate for the package.
  let buildFilePath: string|undefined;
  if (pkg._files.includes('BUILD')) buildFilePath = 'BUILD';
  if (pkg._files.includes('BUILD.bazel')) buildFilePath = 'BUILD.bazel';
  let buildFile = printPackage(pkg);
  if (buildFilePath) {
    buildFile = buildFile + '\n' +
        fs.readFileSync(path.join('node_modules', pkg._dir, buildFilePath), 'utf-8');
  } else {
    buildFilePath = 'BUILD.bazel'
  }

  // If the package didn't ship a bin/BUILD file, generate one.
  if (!pkg._files.includes('bin/BUILD.bazel') && !pkg._files.includes('bin/BUILD')) {
    const binBuildFile = printPackageBin(pkg);
    if (binBuildFile.length) {
      writeFileSync(
          path.posix.join(pkg._dir, 'bin', 'BUILD.bazel'), BUILD_FILE_HEADER + binBuildFile);
    }
  }

  // If there's an index.bzl in the package then copy all the package's files
  // other than the BUILD file which we'll write below.
  // (maybe we shouldn't copy .js though, since it belongs under node_modules?)
  if (pkg._files.includes('index.bzl')) {
    pkg._files.filter(f => f !== 'BUILD' && f !== 'BUILD.bazel').forEach(file => {
      if (/^node_modules[/\\]/.test(file)) {
        // don't copy over nested node_modules
        return;
      }
      // don't support rootPath here?
      let destFile = path.posix.join(pkg._dir, file);
      const basename = path.basename(file);
      const basenameUc = basename.toUpperCase();
      // Bazel BUILD files from npm distribution would have been renamed earlier with a _ prefix so
      // we restore the name on the copy
      if (basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL') {
        destFile = path.posix.join(path.dirname(destFile), basename.substr(1));
      }
      const src = path.posix.join('node_modules', pkg._dir, file);

      mkdirp(path.dirname(destFile));
      fs.copyFileSync(src, destFile);
    });
  } else {
    const indexFile = printIndexBzl(pkg);
    if (indexFile.length) {
      writeFileSync(path.posix.join(pkg._dir, 'index.bzl'), indexFile);
      buildFile += `
# For integration testing
exports_files(["index.bzl"])
`;
    }
  }

  writeFileSync(path.posix.join(pkg._dir, buildFilePath), BUILD_FILE_HEADER + buildFile);
}

/**
 * Generate install_<workspace_name>.bzl files with function to install each workspace.
 */
function generateBazelWorkspaces(pkgs: Dep[]) {
  const workspaces: Bag<string> = {};

  for (const pkg of pkgs) {
    if (!pkg.bazelWorkspaces) {
      continue;
    }

    for (const workspace of Object.keys(pkg.bazelWorkspaces)) {
      // A bazel workspace can only be setup by one npm package
      if (workspaces[workspace]) {
        console.error(
            `Could not setup Bazel workspace ${workspace} requested by npm ` +
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
function generateBazelWorkspace(pkg: Dep, workspace: string) {
  let bzlFile = `# Generated by the yarn_install/npm_install rule
load("@build_bazel_rules_nodejs//internal/copy_repository:copy_repository.bzl", "copy_repository")

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
`;

  const rootPath = pkg.bazelWorkspaces[workspace].rootPath;
  if (!rootPath) {
    console.error(
        `Malformed bazelWorkspaces attribute in ${pkg._dir}@${pkg.version}. ` +
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
    // Bazel BUILD files from npm distribution of rules_nodejs 1.x
    // would have been renamed before publishing with a _ prefix so
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
    writeFileSync(
        path.posix.join(workspaceSourcePath, 'BUILD.bazel'),
        '# Marker file that this directory is a bazel package');
  }
  const sha256sum = crypto.createHash('sha256');
  sha256sum.update(fs.readFileSync(LOCK_FILE_PATH, {encoding: 'utf8'}));
  writeFileSync(
      path.posix.join(workspaceSourcePath, '_bazel_workspace_marker'),
      `# Marker file to used by custom copy_repository rule\n${sha256sum.digest('hex')}`);

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
function generateInstallBazelDependencies(workspaces: string[]) {
  let bzlFile = `# Generated by the yarn_install/npm_install rule
`;
  workspaces.forEach(workspace => {
    bzlFile += `load(\":install_${workspace}.bzl\", \"install_${workspace}\")
`;
  });
  bzlFile += `def install_bazel_dependencies(suppress_warning = False):
    """Installs all workspaces listed in bazelWorkspaces of all npm packages"""
    if not suppress_warning:
        print("""
NOTICE: install_bazel_dependencies is no longer needed,
since @bazel/* npm packages can be load()ed without copying to another repository.
See https://github.com/bazelbuild/rules_nodejs/issues/1877

install_bazel_dependencies is harmful because it causes npm_install/yarn_install to run even
if the requested output artifacts for the build don't require nodejs, making multi-language monorepo
use cases slower.

You should be able to remove install_bazel_workspaces from your WORKSPACE file unless you depend
on a package that exposes a separate repository, like @angular/bazel exposes @npm_angular_bazel//:index.bzl

You can suppress this message by passing "suppress_warning = True" to install_bazel_dependencies()
""")
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
function generateScopeBuildFiles(scope: string, pkgs: Dep[]) {
  const buildFile = BUILD_FILE_HEADER + printScope(scope, pkgs);
  writeFileSync(path.posix.join(scope, 'BUILD.bazel'), buildFile);
}

/**
 * Checks if a path is a file.
 */
function isFile(p: string) {
  return fs.existsSync(p) && fs.statSync(p).isFile();
}

/**
 * Checks if a path is an npm package which is is a directory with a package.json file.
 */
function isDirectory(p: string) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

/**
 * Returns an array of all the files under a directory as relative
 * paths to the directory.
 */
function listFiles(rootDir: string, subDir: string = ''): string[] {
  const dir = path.posix.join(rootDir, subDir);
  if (!isDirectory(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
      .reduce(
          (files: string[], file) => {
            const fullPath = path.posix.join(dir, file);
            const relPath = path.posix.join(subDir, file);
            const isSymbolicLink = fs.lstatSync(fullPath).isSymbolicLink();
            let stat;
            try {
              stat = fs.statSync(fullPath);
            } catch (e) {
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
          },
          [])
      // We return a sorted array so that the order of files
      // is the same regardless of platform
      .sort();
}

/**
 * Returns true if the npm package distribution contained a
 * root /BUILD or /BUILD.bazel file.
 */
function hasRootBuildFile(pkg: Dep, rootPath: string) {
  for (const file of pkg._files) {
    const fileUc = path.relative(rootPath, file).toUpperCase();
    if (fileUc === 'BUILD' || fileUc === 'BUILD.BAZEL' ||
        // Also look for the "hidden" version, from older npm packages published
        // by rules_nodejs 1.x
        fileUc === '_BUILD' || fileUc === '_BUILD.BAZEL') {
      return true;
    }
  }
  return false;
}

/**
 * Finds and returns an array of all packages under a given path.
 */
function findPackages(p = 'node_modules') {
  if (!isDirectory(p)) {
    return [];
  }

  const pkgs: Dep[] = [];

  const listing = fs.readdirSync(p);

  const packages = listing
                       // filter out scopes
                       .filter(f => !f.startsWith('@'))
                       // filter out folders such as `.bin` which can create
                       // issues on Windows since these are "hidden" by default
                       .filter(f => !f.startsWith('.'))
                       .map(f => path.posix.join(p, f))
                       .filter(f => isDirectory(f));

  packages.forEach(f => {
    pkgs.push(parsePackage(f), ...findPackages(path.posix.join(f, 'node_modules')));
  });

  const scopes = listing.filter(f => f.startsWith('@'))
                     .map(f => path.posix.join(p, f))
                     .filter(f => isDirectory(f));
  scopes.forEach(f => pkgs.push(...findPackages(f)));

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
export function parsePackage(p: string): Dep {
  // Parse the package.json file of this package
  const packageJson = path.posix.join(p, 'package.json');
  const stripBom = (s: string) => s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
  const pkg = isFile(packageJson) ?
      JSON.parse(stripBom(fs.readFileSync(packageJson, {encoding: 'utf8'}))) :
      {version: '0.0.0'};

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

  // The subset of files that are valid in runfiles.
  // Files with spaces (\x20) or unicode characters (<\x20 && >\x7E) are not allowed in
  // Bazel runfiles. See https://github.com/bazelbuild/bazel/issues/4327
  pkg._runfiles = pkg._files.filter((f: string) => !/[^\x21-\x7E]/.test(f))

  // Initialize _dependencies to an empty array
  // which is later filled with the flattened dependency list
  pkg._dependencies = [];

  return pkg;
}

/**
 * Check if a bin entry is a non-empty path
 */
function isValidBinPath(entry: any) {
  return isValidBinPathStringValue(entry) || isValidBinPathObjectValues(entry);
}

/**
 * If given a string, check if a bin entry is a non-empty path
 */
function isValidBinPathStringValue(entry: any) {
  return typeof entry === 'string' && entry !== '';
}

/**
 * If given an object literal, check if a bin entry objects has at least one a non-empty path
 * Example 1: { entry: './path/to/script.js' } ==> VALID
 * Example 2: { entry: '' } ==> INVALID
 * Example 3: { entry: './path/to/script.js', empty: '' } ==> VALID
 */
function isValidBinPathObjectValues(entry: Bag<string>): boolean {
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
function cleanupBinPath(p: string) {
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
function cleanupEntryPointPath(p: string) {
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
function findEntryFile(pkg: Dep, path: string) {
  const cleanPath = cleanupEntryPointPath(path);
  // check if main entry point exists
  const entryFile = findFile(pkg, cleanPath) || findFile(pkg, `${cleanPath}.js`);
  if (!entryFile) {
    // If entryPoint entry point listed could not be resolved to a file
    // This can happen
    // in some npm packages that list an incorrect main such as v8-coverage@1.0.8
    // which lists `"main": "index.js"` but that file does not exist.
    log_verbose(
        `could not find entry point for the path ${cleanPath} given by npm package ${pkg._name}`);
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
function resolveMainFile(pkg: Dep, mainFileName: string) {
  const mainEntryField = pkg[mainFileName];

  if (mainEntryField) {
    if (typeof mainEntryField === 'string') {
      return findEntryFile(pkg, mainEntryField)

    } else if (typeof mainEntryField === 'object' && mainFileName === 'browser') {
      // browser has a weird way of defining this
      // the browser value is an object listing files to alias, usually pointing to a browser dir
      const indexEntryPoint = mainEntryField['index.js'] || mainEntryField['./index.js'];
      if (indexEntryPoint) {
        return findEntryFile(pkg, indexEntryPoint)
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
function resolvePkgMainFile(pkg: Dep) {
  // es2015 is another option for mainFile here
  // but its very uncommon and im not sure what priority it takes
  //
  // this list is ordered, we try resolve `browser` first, then `module` and finally fall back to
  // `main`
  const mainFileNames = ['browser', 'module', 'main']

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
    return maybeRootIndex
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

type Bag<T> =
    {
      [k: string]: T
    }

/**
 * Flattens all transitive dependencies of a package
 * into a _dependencies array.
 */
function flattenPkgDependencies(pkg: Dep, dep: Dep, pkgsMap: Map<string, Dep>) {
  if (pkg._dependencies.indexOf(dep) !== -1) {
    // circular dependency
    return;
  }
  pkg._dependencies.push(dep);
  const findDeps = function(targetDeps: Bag<string>, required: boolean, depType: string) {
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
        .forEach(dep => flattenPkgDependencies(pkg, dep!, pkgsMap));
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
  findDeps(dep.peerDependencies, false, 'peer dependency');
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
function printJson(pkg: Dep) {
  // Clone and modify _dependencies to avoid circular issues when JSONifying
  // & delete _files & _runfiles arrays
  const cloned: any = {...pkg};
  cloned._dependencies = pkg._dependencies.map(dep => dep._dir);
  delete cloned._files;
  delete cloned._runfiles;
  return JSON.stringify(cloned, null, 2).split('\n').map(line => `# ${line}`).join('\n');
}

/**
 * A filter function for files in an npm package. Comparison is case-insensitive.
 * @param files array of files to filter
 * @param exts list of white listed case-insensitive extensions; if empty, no filter is
 *             done on extensions; '' empty string denotes to allow files with no extensions,
 *             other extensions are listed with '.ext' notation such as '.d.ts'.
 */
function filterFiles(files: string[], exts: string[] = []) {
  if (exts.length) {
    const allowNoExts = exts.includes('');
    files = files.filter(f => {
      // include files with no extensions if noExt is true
      if (allowNoExts && !path.extname(f)) return true;
      // filter files in exts
      const lc = f.toLowerCase();
      for (const e of exts) {
        if (e && lc.endsWith(e.toLowerCase())) {
          return true;
        }
      }
      return false;
    })
  }
  // Filter out BUILD files that came with the npm package
  return files.filter(file => {
    const basenameUc = path.basename(file).toUpperCase();
    // NB: we don't bother filtering out _BUILD or _BUILD.bazel files
    // that might have been published by rules_nodejs 1.x
    if (basenameUc === 'BUILD' || basenameUc === 'BUILD.BAZEL') {
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
function isNgApfPackage(pkg: Dep) {
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
 * Looks for a file within a package and returns it if found.
 */
function findFile(pkg: Dep, m: string) {
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
function printPackage(pkg: Dep) {
  function starlarkFiles(attr: string, files: string[], comment: string = '') {
    return `
    ${comment ? comment + '\n    ' : ''}${attr} = [
        ${files.map((f: string) => `"//:node_modules/${pkg._dir}/${f}",`).join('\n        ')}
    ],`;
  }

  const includedRunfiles = filterFiles(pkg._runfiles, INCLUDED_FILES);

  // Files that are part of the npm package not including its nested node_modules
  // (filtered by the 'included_files' attribute)
  const pkgFiles = includedRunfiles.filter((f: string) => !f.startsWith('node_modules/'));
  const pkgFilesStarlark = pkgFiles.length ? starlarkFiles('srcs', pkgFiles) : '';

  // Files that are in the npm package's nested node_modules
  // (filtered by the 'included_files' attribute)
  const nestedNodeModules = includedRunfiles.filter((f: string) => f.startsWith('node_modules/'));
  const nestedNodeModulesStarlark =
      nestedNodeModules.length ? starlarkFiles('srcs', nestedNodeModules) : '';

  // Files that have been excluded from the ${pkg._name}__files target above because
  // they are filtered out by 'included_files' or because they are not valid runfiles
  // See https://github.com/bazelbuild/bazel/issues/4327.
  const notPkgFiles = pkg._files.filter(
      (f: string) => !f.startsWith('node_modules/') && !includedRunfiles.includes(f));
  const notPkgFilesStarlark = notPkgFiles.length ? starlarkFiles('srcs', notPkgFiles) : '';

  // If the package is in the Angular package format returns list
  // of package files that end with `.umd.js`, `.ngfactory.js` and `.ngsummary.js`.
  // TODO(gmagolan): add UMD & AMD scripts to scripts even if not an APF package _but_ only if they
  // are named?
  const namedSources = isNgApfPackage(pkg) ?
      filterFiles(pkg._runfiles, ['.umd.js', '.ngfactory.js', '.ngsummary.js']) :
      [];
  const namedSourcesStarlark = namedSources.length ?
      starlarkFiles(
          'named_module_srcs', namedSources,
          '# subset of srcs that are javascript named-UMD or named-AMD scripts') :
      '';

  // Typings files that are part of the npm package not including nested node_modules
  const dtsSources =
      filterFiles(pkg._runfiles, ['.d.ts']).filter((f: string) => !f.startsWith('node_modules/'));
  const dtsStarlark = dtsSources.length ?
      starlarkFiles(
          'srcs', dtsSources,
          `# ${
              pkg._dir} package declaration files (and declaration files in nested node_modules)`) :
      '';

  // Flattened list of direct and transitive dependencies hoisted to root by the package manager
  const deps = [pkg].concat(pkg._dependencies.filter(dep => dep !== pkg && !dep._isNested));
  const depsStarlark =
      deps.map(dep => `"//${dep._dir}:${dep._name}__contents",`).join('\n        ');

  let result =
      `load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

# Generated targets for npm package "${pkg._dir}"
${printJson(pkg)}

# Files that are part of the npm package not including its nested node_modules
# (filtered by the 'included_files' attribute)
filegroup(
    name = "${pkg._name}__files",${pkgFilesStarlark}
)

# Files that are in the npm package's nested node_modules
# (filtered by the 'included_files' attribute)
filegroup(
    name = "${pkg._name}__nested_node_modules",${nestedNodeModulesStarlark}
    visibility = ["//:__subpackages__"],
)

# Files that have been excluded from the ${pkg._name}__files target above because
# they are filtered out by 'included_files' or because they are not valid runfiles
# See https://github.com/bazelbuild/bazel/issues/4327.
filegroup(
    name = "${pkg._name}__not_files",${notPkgFilesStarlark}
    visibility = ["//visibility:private"],
)

# All of the files in the npm package including files that have been
# filtered out by 'included_files' or because they are not valid runfiles
# but not including nested node_modules.
filegroup(
    name = "${pkg._name}__all_files",
    srcs = [":${pkg._name}__files", ":${pkg._name}__not_files"],
)

# The primary target for this package for use in rule deps
node_module_library(
    name = "${pkg._name}",
    # direct sources listed for strict deps support
    srcs = [":${pkg._name}__files"],
    # nested node_modules for this package plus flattened list of direct and transitive dependencies
    # hoisted to root by the package manager
    deps = [
        ${depsStarlark}
    ],
)

# Target is used as dep for main targets to prevent circular dependencies errors
node_module_library(
    name = "${pkg._name}__contents",
    srcs = [":${pkg._name}__files", ":${pkg._name}__nested_node_modules"],${namedSourcesStarlark}
    visibility = ["//:__subpackages__"],
)

# Typings files that are part of the npm package not including nested node_modules
node_module_library(
    name = "${pkg._name}__typings",${dtsStarlark}
)

`;

  let mainEntryPoint = resolvePkgMainFile(pkg)

  // add an `npm_umd_bundle` target to generate an UMD bundle if one does
  // not exists
  if (mainEntryPoint && !findFile(pkg, `${pkg._name}.umd.js`)) {
    result +=
        `load("@build_bazel_rules_nodejs//internal/npm_install:npm_umd_bundle.bzl", "npm_umd_bundle")

npm_umd_bundle(
    name = "${pkg._name}__umd",
    package_name = "${pkg._moduleName}",
    entry_point = "//:node_modules/${pkg._dir}/${mainEntryPoint}",
    package = ":${pkg._name}",
)

`;
  }

  return result;
}

function _findExecutables(pkg: Dep) {
  const executables = new Map();

  // For root packages, transform the pkg.bin entries
  // into a new Map called _executables
  // NOTE: we do this only for non-empty bin paths
  if (isValidBinPath(pkg.bin)) {
    if (!pkg._isNested) {
      if (Array.isArray(pkg.bin)) {
        if (pkg.bin.length == 1) {
          executables.set(pkg._dir, cleanupBinPath(pkg.bin[0]));
        } else {
          // should not happen, but ignore it if present
        }
      } else if (typeof pkg.bin === 'string') {
        executables.set(pkg._dir, cleanupBinPath(pkg.bin));
      } else if (typeof pkg.bin === 'object') {
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
function additionalAttributes(pkg: Dep, name: string) {
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
export function printPackageBin(pkg: Dep) {
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
    data = [${data.map(p => `"${p}"`).join(', ')}],
    templated_args = ["--nobazel_patch_module_resolver"],${additionalAttributes(pkg, name)}
)
`;
    }
  }

  return result;
}

export function printIndexBzl(pkg: Dep) {
  let result = '';
  const executables = _findExecutables(pkg);
  if (executables.size) {
    result =
        `load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "nodejs_test", "npm_package_bin")

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
        npm_package_bin(tool = "@${WORKSPACE}//${pkg._dir}/bin:${
          name}", output_dir = output_dir, **kwargs)
    else:
        nodejs_binary(
            entry_point = "@${WORKSPACE}//:node_modules/${pkg._dir}/${path}",
            data = [${data.map(p => `"${p}"`).join(', ')}] + kwargs.pop("data", []),
            templated_args = ["--nobazel_patch_module_resolver"] + kwargs.pop("templated_args", []),${
          additionalAttributes(pkg, name)}
            **kwargs
        )

# Just in case ${name} is a test runner, also make a test rule for it
def ${name.replace(/-/g, '_')}_test(**kwargs):
    nodejs_test(
      entry_point = "@${WORKSPACE}//:node_modules/${pkg._dir}/${path}",
      data = [${data.map(p => `"${p}"`).join(', ')}] + kwargs.pop("data", []),
      templated_args = ["--nobazel_patch_module_resolver"] + kwargs.pop("templated_args", []),${
          additionalAttributes(pkg, name)}
      **kwargs
    )
`;
    }
  }
  return result;
}

type Dep = {
  _dir: string,
  _isNested: boolean,
  _dependencies: Dep[],
  _files: string[],
  _runfiles: string[],
  [k: string]: any
}

/**
 * Given a scope, return the skylark `node_module_library` target for the scope.
 */
function printScope(scope: string, pkgs: Dep[]) {
  pkgs = pkgs.filter(pkg => !pkg._isNested && pkg._dir.startsWith(`${scope}/`));
  let deps: Dep[] = [];
  pkgs.forEach(pkg => {
    deps = deps.concat(pkg._dependencies.filter(dep => !dep._isNested && !pkgs.includes(pkg)));
  });
  // filter out duplicate deps
  deps = [...pkgs, ...new Set(deps)];

  let pkgFilesStarlark = '';
  if (deps.length) {
    const list = deps.map(dep => `"//${dep._dir}:${dep._name}__files",`).join('\n        ');
    pkgFilesStarlark = `
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
    name = "${scope}",${pkgFilesStarlark}${depsStarlark}
)

`;
}
