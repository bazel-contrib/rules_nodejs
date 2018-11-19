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
 * fine grained Bazel filegroup targets for each root npm package
 * and all files for that package and its transitive deps are included
 * in the filegroup. For example, `@<workspace>//jasmine` would
 * include all files in the jasmine npm package and all of its
 * transitive dependencies.
 *
 * nodejs_binary targets are also generated for all `bin` scripts
 * in each package. For example, the `@<workspace>//jasmine/bin:jasmine`
 * target will be generated for the `jasmine` binary in the `jasmine`
 * npm package.
 *
 * Additionally, a `@<workspace>//:node_modules` filegroup
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

const BUILD_FILE_HEADER = `# Generated file from yarn_install/npm_install rule.
# See $(bazel info output_base)/external/build_bazel_rules_nodejs/internal/npm_install/generate_build_file.js

# All rules in other repositories can use these targets
package(default_visibility = ["//visibility:public"])

`

const args = process.argv.slice(2);
const includedFiles = args[0] ? args[0].split(',') : [];

if (require.main === module) {
  main();
}

function mkdirp(dirname) {
  if (!fs.existsSync(dirname)) {
    mkdirp(path.dirname(dirname));
    fs.mkdirSync(dirname);
  }
}

function writeFileSync(filePath, contents) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

/**
 * Main entrypoint.
 * Write BUILD files.
 */
function main() {
  // find all packages (including packages in nested node_modules)
  const pkgs = findPackages();
  const scopes = findScopes();

  // flatten dependencies
  const pkgsMap = new Map();
  pkgs.forEach(pkg => pkgsMap.set(pkg._dir, pkg));
  pkgs.forEach(pkg => flattenDependencies(pkg, pkg, pkgsMap));

  // generate BUILD files
  generateRootBuildFile(pkgs)
  pkgs.filter(pkg => !pkg._isNested).forEach(pkg => generatePackageBuildFiles(pkg));
  scopes.forEach(scope => generateScopeBuildFiles(scope, pkgs));
}

module.exports = {main};

function generateRootBuildFile(pkgs) {
  const srcs = pkgs.filter(pkg => !pkg._isNested);
  const binFiles = listFiles('node_modules/.bin');

  let buildFile = BUILD_FILE_HEADER + `# The node_modules directory in one catch-all filegroup.
# NB: Using this target may have bad performance implications if
# there are many files in filegroup.
# See https://github.com/bazelbuild/bazel/issues/5153.
#
# This filegroup includes only js, d.ts, json and proto files as well as the
# pkg/bin folders and .bin folder. This can be used in some cases to improve
# performance by reducing the number of runfiles. The recommended approach
# to reducing performance is to use fine grained deps such as
# ["@npm//a", "@npm//b", ...]. There are cases where the node_modules
# filegroup will not include files with no extension that are needed. The
# feature request https://github.com/bazelbuild/bazel/issues/5769 would allow
# this filegroup to include those files.
filegroup(
    name = "node_modules",
    srcs = [
        ${binFiles.map(f => `"node_modules/.bin/${f}",`).join('\n        ')}
        ${srcs.map(pkg => `"//node_modules/${pkg._dir}:${pkg._name}__files",`).join('\n        ')}
    ],
)

`

  // Add the manual build file contents if they exists
  try {
    buildFile += fs.readFileSync(`manual_build_file_contents`, {encoding: 'utf8'});
  } catch (e) {
  }

  writeFileSync('BUILD.bazel', buildFile);
}

function generatePackageBuildFiles(pkg) {
  const buildFile =
      BUILD_FILE_HEADER + `load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

` + printPackage(pkg);
  writeFileSync(path.posix.join('node_modules', pkg._dir, 'BUILD.bazel'), buildFile);

  const aliasBuildFile = BUILD_FILE_HEADER + printPackageAlias(pkg);
  writeFileSync(path.posix.join(pkg._dir, 'BUILD.bazel'), aliasBuildFile);

  const binAliasesBuildFile = BUILD_FILE_HEADER + printPackageBinAliases(pkg);
  writeFileSync(path.posix.join(pkg._dir, 'bin', 'BUILD.bazel'), binAliasesBuildFile);
}

function generateScopeBuildFiles(scope, pkgs) {
  const buildFile = BUILD_FILE_HEADER + printScope(scope, pkgs);
  writeFileSync(path.posix.join('node_modules', scope, 'BUILD.bazel'), buildFile);

  const aliasBuildFile = BUILD_FILE_HEADER + printScopeAlias(scope);
  writeFileSync(path.posix.join(scope, 'BUILD.bazel'), aliasBuildFile);
}

/**
 * Checks if a path is an npm package which is is a directory with a package.json file.
 */
function isPackage(p) {
  const packageJson = path.posix.join(p, 'package.json');
  return fs.statSync(p).isDirectory() && fs.existsSync(packageJson) &&
      fs.statSync(packageJson).isFile();
}

/**
 * Returns an array of all the files under a directory as relative
 * paths to the directory.
 */
function listFiles(rootDir, subDir = '') {
  const dir = path.posix.join(rootDir, subDir);
  return fs
      .readdirSync(dir)
      .reduce((files, file) => {
        const fullPath = path.posix.join(dir, file);
        const relPath = path.posix.join(subDir, file);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          if (fs.lstatSync(fullPath).isSymbolicLink()) {
            // filter out broken symbolic links... these cause fs.statSync(fullPath)
            // to fail with `ENOENT: no such file or directory ...`
            return files;
          }
          throw e;
        }
        if (stat.isFile() && (/^BUILD$/i.test(file) || /^BUILD\.bazel$/i.test(file))) {
          // Delete BUILD and BUILD.bazel files so that so that files do not cross Bazel package
          // boundaries. npm packages should not generally include BUILD or BUILD.bazel files
          // but they may as rxjs does temporarily.
          fs.unlinkSync(fullPath);
          return files;
        }
        return stat.isDirectory() ? files.concat(listFiles(rootDir, relPath)) :
                                    files.concat(relPath);
      }, []);
}

/**
 * Finds and returns an array of all packages under a given path.
 */
function findPackages(p = 'node_modules') {
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    return [];
  }

  const result = [];

  const listing = fs.readdirSync(p);

  const packages = listing.filter(f => !f.startsWith('@'))
                       .map(f => path.posix.join(p, f))
                       .filter(f => isPackage(f));
  packages.forEach(
      f => result.push(parsePackage(f), ...findPackages(path.posix.join(f, 'node_modules'))));

  const scopes = listing.filter(f => f.startsWith('@'))
                     .map(f => path.posix.join(p, f))
                     .filter(f => fs.statSync(f).isDirectory());
  scopes.forEach(f => result.push(...findPackages(f)));

  return result;
}

function findScopes() {
  const p = 'node_modules';
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    return [];
  }

  const listing = fs.readdirSync(p);

  const scopes = listing.filter(f => f.startsWith('@'))
                     .map(f => path.posix.join(p, f))
                     .filter(f => fs.statSync(f).isDirectory())
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
  const pkg = JSON.parse(fs.readFileSync(`${p}/package.json`, {encoding: 'utf8'}));

  // Trim the leading node_modules from the path and
  // assign to _dir for future use
  pkg._dir = p.replace(/^node_modules\//, '');

  // Stash the package directory name for future use
  pkg._name = pkg._dir.split('/').pop();

  // Keep track of whether or not this is a nested package
  pkg._isNested = p.match(/\/node_modules\//);

  // List all the files in the npm package for later use
  pkg._files = listFiles(p);

  // Initialize _dependencies to an empty array
  // which is later filled with the flattened dependency list
  pkg._dependencies = [];

  // For root packages, transform the pkg.bin entries
  // into a new Map called _executables
  pkg._executables = new Map();
  if (!pkg._isNested) {
    if (Array.isArray(pkg.bin)) {
      // should not happen, but ignore it if present
    } else if (typeof pkg.bin === 'string') {
      pkg._executables.set(pkg._dir, cleanupBinPath(pkg.bin));
    } else if (typeof pkg.bin === 'object') {
      for (let key in pkg.bin) {
        pkg._executables.set(key, cleanupBinPath(pkg.bin[key]));
      }
    }
  }

  return pkg;
}

/**
 * Given a path, remove './' if it exists.
 */
function cleanupBinPath(path) {
  // Bin paths usually come in 2 flavors: './bin/foo' or 'bin/foo',
  // sometimes other stuff like 'lib/foo'.  Remove prefix './' if it
  // exists.
  path = path.replace(/\\/g, '/');
  if (path.indexOf('./') === 0) {
    path = path.slice(2);
  }
  return path;
}

/**
 * Flattens all transitive dependencies of a package
 * into a _dependencies array.
 */
function flattenDependencies(pkg, dep, pkgsMap) {
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
            throw new Error(`Could not find ${depType} '${targetDep}' of '${dep._dir}'`)
          }
          return null;
        })
        .filter(dep => !!dep)
        .map(dep => flattenDependencies(pkg, dep, pkgsMap));
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
 * A filter function for a bazel filegroup.
 * @param files array of files to filter
 * @param exts list of white listed extensions; if empty, no filter is done on extensions;
 *             '' empty string denotes to allow files with no extensions, other extensions
 *             are listed with '.ext' notation such as '.d.ts'.
 */
function filterFilesForFilegroup(files, exts = []) {
  // Files with spaces (\x20) or unicode characters (<\x20 && >\x7E) are not allowed in
  // Bazel runfiles. See https://github.com/bazelbuild/bazel/issues/4327
  files = files.filter(f => !f.match(/[^\x21-\x7E]/));
  if (exts.length) {
    const allowNoExts = exts.includes('');
    files = files.filter(f => {
      // include files with no extensions if noExt is true
      if (allowNoExts && !path.extname(f)) return true;
      // filter files in exts
      for (const e of exts) {
        if (e && f.endsWith(e)) {
          return true;
        }
      }
      return false;
    })
  }
  return files;
}

/**
 * Given a pkg, print a skylark `filegroup` target for the package.
 */
function printPackage(pkg) {
  const sources = filterFilesForFilegroup(pkg._files, includedFiles);
  const dtsSources = filterFilesForFilegroup(pkg._files, ['.d.ts']);
  const pkgDeps = pkg._dependencies.filter(dep => dep != pkg).filter(dep => !dep._isNested);

  let result = `
# Generated targets for npm package "${pkg._dir}"
${printJson(pkg)}

filegroup(
    name = "${pkg._name}__pkg",
    srcs = [
        # ${pkg._dir} package contents (and contents of nested node_modules)
        ":${pkg._name}__files",
        # direct or transitive dependencies hoisted to root by the package manager
        ${
      pkgDeps.map(dep => `"//node_modules/${dep._dir}:${dep._name}__files",`).join('\n        ')}
    ],
    tags = ["NODE_MODULE_MARKER"],
)

filegroup(
    name = "${pkg._name}__files",
    srcs = [
        ${sources.map(f => `":${f}",`).join('\n        ')}
    ],
    tags = ["NODE_MODULE_MARKER"],
)

filegroup(
    name = "${pkg._name}__typings",
    srcs = [
        ${dtsSources.map(f => `":${f}",`).join('\n        ')}
    ],
    tags = ["NODE_MODULE_MARKER"],
)

`;

  if (pkg._executables) {
    for (const [name, path] of pkg._executables.entries()) {
      result += `# Wire up the \`bin\` entry \`${name}\`
nodejs_binary(
    name = "${name}__bin",
    entry_point = "${pkg._dir}/${path}",
    install_source_map_support = False,
    data = [":${pkg._name}__pkg"],
)

`;
    }
  }

  return result;
}

function printPackageAlias(pkg) {
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
  name = "${pkg._name}__typings",
  actual = "//node_modules/${pkg._dir}:${pkg._name}__typings"
)
`;
}

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
 * Given a scope, print a skylark `filegroup` target for the scope.
 */
function printScope(scope, pkgs) {
  const srcs = pkgs.filter(pkg => !pkg._isNested && pkg._dir.startsWith(`${scope}/`));
  return `
# Generated target for npm scope ${scope}
filegroup(
    name = "${scope}",
    srcs = [
        ${srcs.map(pkg => `"//node_modules/${pkg._dir}:${pkg._name}__pkg",`).join('\n        ')}
    ],
    tags = ["NODE_MODULE_MARKER"],
)

`;
}

function printScopeAlias(scope) {
  return `
# Generated alias target for npm scope ${scope}
alias(
    name = "${scope}",
    actual = "//node_modules/${scope}",
)

`;
}
