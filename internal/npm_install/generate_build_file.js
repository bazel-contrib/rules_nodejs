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

const fs = require('fs');
const path = require('path');

const DEBUG = false;

const BUILD_FILE_HEADER = `# Generated file from yarn_install/npm_install rule.
# See $(bazel info output_base)/external/build_bazel_rules_nodejs/internal/npm_install/generate_build_file.js

# All rules in other repositories can use these targets
package(default_visibility = ["//visibility:public"])

`

const args = process.argv.slice(2);
const WORKSPACE = args[0];
const LOCK_FILE_LABEL = args[1];
const INCLUDED_FILES = args[2] ? args[2].split(',') : [];

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
  fs.writeFileSync(p, '');
  const fd = fs.openSync(p, 'rs+');
  fs.writeSync(fd, content);
  fs.fsyncSync(fd);
  fs.closeSync(fd);
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
  generateBazelWorkspaces(pkgs)

  // generate all BUILD files
  generateBuildFiles(pkgs)
}

module.exports = {
  main,
  printPackage
};

/**
 * Generates all build files
 */
function generateBuildFiles(pkgs) {
  generateRootBuildFile(pkgs)
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
function handleBazelFiles(pkg) {
  if (pkg._previouslyProcessed) {
    // This npm package has already been processed and bazel files
    // from the npm distribution prefixed with `_`. However, there are
    // now generated Bazel files which must be filtered out.
    pkg._files = pkg._files.filter(file => {
      const basenameUc = path.basename(file).toUpperCase();
      if (basenameUc === 'BUILD' || basenameUc === 'BUILD.BAZEL') {
        return false;
      }
      return true;
    });
  } else {
    // This is the first processing of this npm package.
    // All Bazel files in the npm distribution should be renamed by
    // adding a `_` prefix so they can be preserved for bazel workspaces
    // and so that file targets don't cross package boundaries.
    pkg._files = pkg._files.map(file => {
      const basename = path.basename(file);
      const basenameUc = basename.toUpperCase();
      if (basenameUc === 'WORKSPACE' || basenameUc === 'BUILD' || basenameUc === 'BUILD.BAZEL') {
        const newFile = path.posix.join(path.dirname(file), `_${basename}`);
        const srcPath = path.posix.join('node_modules', pkg._dir, file);
        const dstPath = path.posix.join('node_modules', pkg._dir, newFile);
        fs.renameSync(srcPath, dstPath);
        return newFile;
      }
      return file;
    });
  }
}

/**
 * Generates the root BUILD file.
 */
function generateRootBuildFile(pkgs) {
  const srcs = pkgs.filter(pkg => !pkg._isNested);

  let srcsStarlark = '';
  if (srcs.length) {
    const list =
        srcs.map(pkg => `"//node_modules/${pkg._dir}:${pkg._name}__files",`).join('\n        ');
    srcsStarlark = `
    # direct sources listed for strict deps support
    srcs = [
        ${list}
    ],`;
  }

  let depsStarlark = '';
  if (srcs.length) {
    const list =
        srcs.map(pkg => `"//node_modules/${pkg._dir}:${pkg._name}__contents",`).join('\n        ');
    depsStarlark = `
    # flattened list of direct and transitive dependencies hoisted to root by the package manager
    deps = [
        ${list}
    ],`;
  }

  let buildFile = BUILD_FILE_HEADER +
      `load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

# The node_modules directory in one catch-all node_module_library.
# NB: Using this target may have bad performance implications if
# there are many files in target.
# See https://github.com/bazelbuild/bazel/issues/5153.
node_module_library(
    name = "node_modules",${srcsStarlark}${depsStarlark}
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
 * Generates all BUILD files for a package.
 */
function generatePackageBuildFiles(pkg) {
  const buildFile = BUILD_FILE_HEADER + printPackage(pkg);
  writeFileSync(path.posix.join('node_modules', pkg._dir, 'BUILD.bazel'), buildFile);

  const aliasBuildFile = BUILD_FILE_HEADER + printPackageAliases(pkg);
  writeFileSync(path.posix.join(pkg._dir, 'BUILD.bazel'), aliasBuildFile);

  const binAliasesBuildFile = BUILD_FILE_HEADER + printPackageBinAliases(pkg);
  writeFileSync(path.posix.join(pkg._dir, 'bin', 'BUILD.bazel'), binAliasesBuildFile);

  writeFileSync(
      path.posix.join('node_modules', pkg._dir, '_bazel_marker'),
      '# Marker file used by yarn_install & npm_install that indicates BUILD files have been generated for this npm package');
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
function generateBazelWorkspace(pkg, workspace) {
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
    // Bazel files from npm distribution would have been renamed earlier with a _ prefix so
    // we restore them on the copy; we do not copy generated BUILD files.
    if (basenameUc === '_WORKSPACE' || basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL') {
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
  writeFileSync(
      path.posix.join(workspaceSourcePath, '_bazel_workspace_marker'),
      '# Marker file to used by custom copy_repository rule');

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
  writeFileSync(path.posix.join('node_modules', scope, 'BUILD.bazel'), buildFile);

  const aliasBuildFile = BUILD_FILE_HEADER + printScopeAlias(scope);
  writeFileSync(path.posix.join(scope, 'BUILD.bazel'), aliasBuildFile);
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
      .reduce(
          (files, file) => {
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
              // This is tested in internal/e2e/fine_grained_symlinks.
              return files;
            }
            return isDirectory ? files.concat(listFiles(rootDir, relPath)) : files.concat(relPath);
          },
          [])
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
                       // .filter(f => !f.startsWith('.'))
                       .map(f => path.posix.join(p, f))
                       .filter(f => isDirectory(f));
  packages.forEach(
      f => pkgs.push(parsePackage(f), ...findPackages(path.posix.join(f, 'node_modules'))));

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
function parsePackage(p) {
  // Parse the package.json file of this package
  const packageJson = path.posix.join(p, 'package.json');
  const pkg = isFile(packageJson) ? JSON.parse(fs.readFileSync(packageJson, {encoding: 'utf8'})) :
                                    {version: '0.0.0'};

  // Trim the leading node_modules from the path and
  // assign to _dir for future use
  pkg._dir = p.replace(/^node_modules\//, '');

  // Stash the package directory name for future use
  pkg._name = pkg._dir.split('/').pop();

  // Keep track of whether or not this is a nested package
  pkg._isNested = /\/node_modules\//.test(p);

  // List all the files in the npm package for later use
  pkg._files = listFiles(p);

  // Initialize _dependencies to an empty array
  // which is later filled with the flattened dependency list
  pkg._dependencies = [];

  // For root packages, transform the pkg.bin entries
  // into a new Map called _executables
  // NOTE: we do this only for non-empty bin paths
  if (isValidBinPath(pkg.bin)) {
    pkg._executables = new Map();
    if (!pkg._isNested) {
      if (Array.isArray(pkg.bin)) {
        // should not happen, but ignore it if present
      } else if (typeof pkg.bin === 'string') {
        pkg._executables.set(pkg._dir, cleanupBinPath(pkg.bin));
      } else if (typeof pkg.bin === 'object') {
        for (let key in pkg.bin) {
          if (isValidBinPathStringValue(pkg.bin[key])) {
            pkg._executables.set(key, cleanupBinPath(pkg.bin[key]));
          }
        }
      }
    }
  }

  // Check for a `_bazel_marker` marker file in the package folder which
  // indicates that this npm package has already been processed by this
  // script. This can happen with symlinked node_modules.
  pkg._previouslyProcessed =
      fs.existsSync(path.posix.join('node_modules', pkg._dir, '_bazel_marker'));

  // Handle bazel files in this package before parsing the next package.
  // This is to prevent issues caused by symlinks between package and nested
  // packages setup by the package manager.
  handleBazelFiles(pkg)

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
      Object.values(entry).filter(_entry => isValidBinPath(_entry)).length > 0;
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
 * Flattens all transitive dependencies of a package
 * into a _dependencies array.
 */
function flattenPkgDependencies(pkg, dep, pkgsMap) {
  if (pkg._dependencies.indexOf(dep) !== -1) {
    // circular dependency
    return;
  }
  pkg._dependencies.push(dep);
  const findDeps = function(targetDeps, required, depType) {
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
            console.error(`Could not find ${depType} '${targetDep}' of '${dep._dir}'`);
            process.exit(1);
          }
          return null;
        })
        .filter(dep => !!dep)
        .map(dep => flattenPkgDependencies(pkg, dep, pkgsMap));
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
  const cloned = {...pkg};
  cloned._dependencies = cloned._dependencies.map(dep => dep._dir);
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
  // Filter out internal files
  return files.filter(file => {
    const basenameUc = path.basename(file).toUpperCase();
    if (basenameUc === '_WORKSPACE' || basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL' ||
        basenameUc === '_BAZEL_MARKER') {
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
        ${scripts.map(f => `":${f}",`).join('\n        ')}
    ],`;
  }

  let srcsStarlark = '';
  if (sources.length) {
    srcsStarlark = `
    # ${pkg._dir} package files (and files in nested node_modules)
    srcs = [
        ${sources.map(f => `":${f}",`).join('\n        ')}
    ],`;
  }

  let depsStarlark = '';
  if (deps.length) {
    const list =
        deps.map(dep => `"//node_modules/${dep._dir}:${dep._name}__contents",`).join('\n        ');
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
        ${dtsSources.map(f => `":${f}",`).join('\n        ')}
    ],`;
  }

  let result = '';
  if (isValidBinPath(pkg.bin)) {
    // load the nodejs_binary definition only for non-empty bin paths
    result = 'load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")';
  }

  result = `${result}
load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")

# Generated targets for npm package "${pkg._dir}"
${printJson(pkg)}

filegroup(
    name = "${pkg._name}__files",${srcsStarlark}
)

node_module_library(
    name = "${pkg._name}__pkg",
    # direct sources listed for strict deps support
    srcs = [":${pkg._name}__files"],${depsStarlark}
)

# ${pkg._name}__contents target is used as dep for __pkg targets to prevent
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

  let mainEntryPoint = pkg.main ? cleanupEntryPointPath(pkg.main) : undefined;
  if (mainEntryPoint) {
    // check if main entry point exists
    mainEntryPoint = findFile(pkg, mainEntryPoint) || findFile(pkg, `${mainEntryPoint}.js`);
    if (!mainEntryPoint) {
      // If "main" entry point listed could not be resolved to a file
      // then don't create an npm_umd_bundle target. This can happen
      // in some npm packages that list an incorrect main such as v8-coverage@1.0.8
      // which lists `"main": "index.js"` but that file does not exist.
      if (DEBUG)
        console.error(`Could not find "main" entry point ${pkg.main} in npm package ${pkg._name}`);
    }
  } else {
    // if "main" is not specified then look for a root index.js
    mainEntryPoint = findFile(pkg, 'index.js');
  }

  // add an `npm_umd_bundle` target to generate an UMD bundle if one does
  // not exists
  if (mainEntryPoint && !findFile(pkg, `${pkg._name}.umd.js`)) {
    result +=
        `load("@build_bazel_rules_nodejs//internal/npm_install:npm_umd_bundle.bzl", "npm_umd_bundle")

npm_umd_bundle(
    name = "${pkg._name}__umd",
    package_name = "${pkg._name}",
    entry_point = ":${mainEntryPoint}",
    package = ":${pkg._name}__pkg",
)

`;
  }

  if (pkg._executables) {
    for (const [name, path] of pkg._executables.entries()) {
      // Handle additionalAttributes of format:
      // ```
      // "bazelBin": {
      //   "ngc-wrapped": {
      //     "additionalAttributes": {
      //       "configuration_env_vars": "[\"compile\"]"
      //   }
      // },
      // ```
      let additionalAttributes = '';
      if (pkg.bazelBin && pkg.bazelBin[name] && pkg.bazelBin[name].additionalAttributes) {
        const attrs = pkg.bazelBin[name].additionalAttributes;
        for (const attrName of Object.keys(attrs)) {
          const attrValue = attrs[attrName];
          additionalAttributes += `\n    ${attrName} = ${attrValue},`;
        }
      }
      result += `# Wire up the \`bin\` entry \`${name}\`
nodejs_binary(
    name = "${name}__bin",
    entry_point = ":${path}",
    install_source_map_support = False,
    data = [":${pkg._name}__pkg"],${additionalAttributes}
)

`;
    }
  }

  return result;
}

/**
 * Given a pkg, return the skylark aliases for the package.
 */
function printPackageAliases(pkg) {
  return `
# Generated target alias for npm package "${pkg._dir}"
${printJson(pkg)}
alias(
  name = "${pkg._name}",
  actual = "//node_modules/${pkg._dir}:${pkg._name}__pkg"
)

alias(
  name = "${pkg._name}__files",
  actual = "//node_modules/${pkg._dir}:${pkg._name}__files"
)

alias(
  name = "${pkg._name}__contents",
  actual = "//node_modules/${pkg._dir}:${pkg._name}__contents"
)

alias(
  name = "${pkg._name}__typings",
  actual = "//node_modules/${pkg._dir}:${pkg._name}__typings"
)
`;
}

/**
 * Given a pkg, return the skylark aliases for the package bins.
 */
function printPackageBinAliases(pkg) {
  let result = '';

  if (pkg._executables) {
    for (const [name, path] of pkg._executables.entries()) {
      result += `# Wire up the \`bin\` entry \`${name}\`
alias(
    name = "${name}",
    actual = "//node_modules/${pkg._dir}:${name}__bin",
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
    const list =
        deps.map(dep => `"//node_modules/${dep._dir}:${dep._name}__files",`).join('\n        ');
    srcsStarlark = `
    # direct sources listed for strict deps support
    srcs = [
        ${list}
    ],`;
  }

  let depsStarlark = '';
  if (deps.length) {
    const list =
        deps.map(dep => `"//node_modules/${dep._dir}:${dep._name}__contents",`).join('\n        ');
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

/**
 * Given a scope, return the skylark alias for the scope.
 */
function printScopeAlias(scope) {
  return `
# Generated alias target for npm scope ${scope}
alias(
    name = "${scope}",
    actual = "//node_modules/${scope}",
)

`;
}
