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
const WORKSPACE = args[0];
const INCLUDED_FILES = args[1] ? args[1].split(',') : [];

if (require.main === module) {
  main();
}

/**
 * Create a directory if it does not exist.
 */
function mkdirp(dirname) {
  if (!fs.existsSync(dirname)) {
    mkdirp(path.dirname(dirname));
    fs.mkdirSync(dirname);
  }
}

/**
 * Writes a file, first ensuring that the directory to
 * write to exists.
 */
function writeFileSync(filePath, contents) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

/**
 * Main entrypoint.
 * Write BUILD and .bzl files.
 */
function main() {
  // find all packages (including packages in nested node_modules)
  const pkgs = findPackages();
  const scopes = findScopes();

  // flatten dependencies
  const pkgsMap = new Map();
  pkgs.forEach(pkg => pkgsMap.set(pkg._dir, pkg));
  pkgs.forEach(pkg => flattenDependencies(pkg, pkg, pkgsMap));

  // generate Bazel workspaces install files
  const bazelWorkspaces = {};
  pkgs.forEach(pkg => processBazelWorkspaces(pkg, bazelWorkspaces));
  generateBazelWorkspaces(bazelWorkspaces)
  generateInstallBazelDependencies(Object.keys(bazelWorkspaces));

  // now that we have processed all the bazel workspaces in all
  // npm packages we can delete the Bazel files from these packages
  // so that filegroups do not cross Bazel package boundaries
  pkgs.forEach(pkg => deleteBazelFiles(pkg));

  // generate BUILD files
  generateRootBuildFile(pkgs)
  pkgs.filter(pkg => !pkg._isNested).forEach(pkg => generatePackageBuildFiles(pkg));
  scopes.forEach(scope => generateScopeBuildFiles(scope, pkgs));
}

module.exports = {main};

/**
 * Generates the root BUILD file.
 */
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

/**
 * Generates all BUILD files for a package.
 */
function generatePackageBuildFiles(pkg) {
  const buildFile =
      BUILD_FILE_HEADER + `load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

` + printPackage(pkg);
  writeFileSync(path.posix.join('node_modules', pkg._dir, 'BUILD.bazel'), buildFile);

  const aliasBuildFile = BUILD_FILE_HEADER + printPackageAliases(pkg);
  writeFileSync(path.posix.join(pkg._dir, 'BUILD.bazel'), aliasBuildFile);

  const binAliasesBuildFile = BUILD_FILE_HEADER + printPackageBinAliases(pkg);
  writeFileSync(path.posix.join(pkg._dir, 'bin', 'BUILD.bazel'), binAliasesBuildFile);
}

/**
 * Compares two version strings.
 * Note: This function only handles numeric versions such as `1.2.3`. Versions such as
 *       `0.22.0-26-g9088e46` should be reduced to `0.22.0` before calling.
 * @returns a number < 0 if a < b
 *          a number > 0 if a > b
 *          0 if a = b
 * From stack overflow:
 * https://stackoverflow.com/questions/6832596/how-to-compare-software-version-number-using-js-only-number
 */
function cmpVersions(a, b) {
  const regExStrip0 = /(\.0+)+$/;
  const segmentsA = a.replace(regExStrip0, '').split('.');
  const segmentsB = b.replace(regExStrip0, '').split('.');
  const l = Math.min(segmentsA.length, segmentsB.length);
  for (let i = 0; i < l; i++) {
    const diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
    if (diff) {
      return diff;
    }
  }
  return segmentsA.length - segmentsB.length;
}

/**
 * Process the `bazelWorkspaces` attribute in an npm package and adds
 * all workspaces to be installed to `bazelWorkspaces` map
 */
function processBazelWorkspaces(pkg, bazelWorkspaces) {
  if (pkg.bazelWorkspaces) {
    // This npm package specifies one or more bazel packages to setup
    Object.keys(pkg.bazelWorkspaces)
        .forEach(
            bwName =>
                processBazelWorkspace(bwName, pkg.bazelWorkspaces[bwName], pkg, bazelWorkspaces));
  }
}

/**
 * Process a bazel workspace request in an npm package and adds
 * all workspaces to be installed to `bazelWorkspaces` map
 */
function processBazelWorkspace(bwName, bwDetails, pkg, bazelWorkspaces) {
  let alreadySetup = bazelWorkspaces[bwName];

  // Ensure bazel workspace object has required rootPath attribute
  if (!bwDetails.rootPath) {
    console.error(
        `Malformed bazelWorkspaces attribute in ${pkg._dir}@${pkg.version}. ` +
        `Missing rootPath for workspace ${bwName}.`);
    process.exit(1);
  }

  // Trim development versions such as '0.22.0-26-g9088e46' down to their semver
  const bwVersion = bwDetails.version ? bwDetails.version.split('-')[0] : undefined;
  const bwDevVersion = bwDetails.version ? bwDetails.version != bwVersion : false;

  // If no compatVersion is specified then it is equal to the version
  if (!bwDetails.compatVersion) {
    bwDetails.compatVersion = bwDetails.version
  }

  // If this workspace has been previously installed than check for compatibility
  if (alreadySetup) {
    if (bwVersion && alreadySetup.version) {
      // Bazel workspace setup is versioned to allow for multiple
      // setup requests from different npm packages as long as the versions are
      // compatible
      if (cmpVersions(bwVersion, alreadySetup.compatVersion) < 0 ||
          cmpVersions(bwDetails.compatVersion, alreadySetup.compatVersion) !== 0) {
        console.error(
            `Could not setup Bazel workspace ${bwName}@${bwVersion} ` +
            `requested by npm package ${pkg._dir}@${pkg.version}. Incompatible Bazel workspace ` +
            `${bwName}@${alreadySetup.version} already setup by ` +
            `${alreadySetup.sources.join(', ')}.`);
        process.exit(1);
      }
      if (cmpVersions(bwVersion, alreadySetup.version) < 0 ||
          (cmpVersions(bwVersion, alreadySetup.version) == 0 && !bwDevVersion)) {
        // No reason to update to an older compatible version or an equal non-dev-version
        alreadySetup.sources.push(`${pkg._dir}@${pkg.version}`);
        return;
      }
    } else {
      // Non-version bazel workspace setup requests can only be done once
      console.error(
          `Could not setup Bazel workspace ${bwName} requested by npm ` +
          `package ${pkg._dir}@${pkg.version}. No version metadata to check compatibility ` +
          `against Bazel workspace setup by ${alreadySetup.sources.join(', ')}.`);
      process.exit(1);
    }
  }

  // Keep track of which npm package setup this bazel workspace for later use
  if (!alreadySetup) {
    alreadySetup = bazelWorkspaces[bwName] = {
      sources: [],
    }
  }
  alreadySetup.version = bwVersion;
  alreadySetup.devVersion = bwDevVersion;
  alreadySetup.compatVersion = bwDetails.compatVersion;
  alreadySetup.rootPath = bwDetails.rootPath;
  alreadySetup.sources.push(`${pkg._dir}@${pkg.version}`);
  alreadySetup.pkg = pkg;
}

/**
 * Generate install_<workspace_name>.bzl files with function to install each workspace.
 */
function generateBazelWorkspaces(bazelWorkspaces) {
  Object.keys(bazelWorkspaces)
      .forEach(bwName => generateBazelWorkspace(bwName, bazelWorkspaces[bwName]));
}

/**
 * Generate install_<bwName>.bzl file with function to install the workspace.
 */
function generateBazelWorkspace(bwName, bwDetails) {
  let bzlFile = `# Generated by the yarn_install/npm_install rule
def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
`;

  // Copy all files for this workspace to a folder under _workspaces
  // to preserve the Bazel files which will be deleted from the npm package
  // by deleteBazelFiles()
  const workspaceSourcePath = path.posix.join('_workspaces', bwName);
  mkdirp(workspaceSourcePath);
  bwDetails.pkg._files.forEach(file => {
    if (/^node_modules[/\\]/.test(file)) {
      // don't copy over nested node_modules
      return;
    }
    const src = path.posix.join('node_modules', bwDetails.pkg._dir, file);
    const dest = path.posix.join(workspaceSourcePath, file);
    mkdirp(path.dirname(dest));
    console.error(`copying ${src} -> ${dest}`);
    fs.copyFileSync(src, dest);
  });

  // We create _bazel_workspace_marker that is used by the custom copy_repository
  // rule to resolve the path to the repository source root. A root BUILD file
  // is required to reference _bazel_workspace_marker as a target so we also create
  // an empty one if one does not exist.
  if (!hasRootBuildFile(bwDetails.pkg)) {
    writeFileSync(
        path.posix.join(workspaceSourcePath, 'BUILD.bazel'),
        '# Marker file that this directory is a bazel package');
  }
  writeFileSync(
      path.posix.join(workspaceSourcePath, '_bazel_workspace_marker'),
      '# Marker file to used by custom copy_repository rule');

  bzlFile += `load("@build_bazel_rules_nodejs//tools:copy_repository.bzl", "copy_repository")
def install_${bwName}():
    _maybe(
        copy_repository,
        name = "${bwName}",
        marker_file = "@${WORKSPACE}//_workspaces/${bwName}:_bazel_workspace_marker",
    )
`;

  writeFileSync(`install_${bwName}.bzl`, bzlFile);
}

/**
 * Generate install_bazel_dependencies.bzl with function to install all workspaces.
 */
function generateInstallBazelDependencies(bazelWorkspaceNames) {
  let bzlFile = `# Generated by the yarn_install/npm_install rule
`;
  bazelWorkspaceNames.forEach(bwName => {
    bzlFile += `load(\":install_${bwName}.bzl\", \"install_${bwName}\")
`;
  });
  bzlFile += `def install_bazel_dependencies():
    """Installs all workspaces listed in bazelWorkspaces of all npm packages"""
`;
  bazelWorkspaceNames.forEach(bwName => {
    bzlFile += `    install_${bwName}()
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
function isPackage(p) {
  return fs.statSync(p).isDirectory() && isFile(path.posix.join(p, 'package.json'));
}

/**
 * Returns an array of all the files under a directory as relative
 * paths to the directory.
 */
function listFiles(rootDir, subDir = '') {
  const dir = path.posix.join(rootDir, subDir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }
  return fs
      .readdirSync(dir)
      .reduce((files, file) => {
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
      }, []);
}

/**
 * Delete all WORKSPACE, BUILD and .bzl files from an npm package.
 */
function deleteBazelFiles(pkg) {
  pkg._files = pkg._files.filter(file => {
    const basename = path.basename(file);
    if (/^WORKSPACE$/i.test(basename) || /^BUILD$/i.test(basename) ||
        /^BUILD\.bazel$/i.test(basename) || /\.bzl$/i.test(basename)) {
      // Delete BUILD and BUILD.bazel files so that so that files do not cross Bazel packages
      // boundaries
      const fullPath = path.posix.join('node_modules', pkg._dir, file);
      if (!fs.existsSync(fullPath)) {
        // It is possible that the file no longer exists as reported in
        // https://github.com/bazelbuild/rules_nodejs/issues/522
        return false;
      }
      fs.unlinkSync(fullPath);
      return false;
    }
    return true;
  });
}

/**
 * Returns true if a pkg._files contains a root /BUILD or /BUILD.bazel file.
 */
function hasRootBuildFile(pkg) {
  for (const file of pkg._files) {
    if (/^BUILD$/i.test(file) || /^BUILD\.bazel$/i.test(file)) {
      return true;
    }
  }
  return false;
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

/**
 * Finds and returns an array of all package scopes in node_modules.
 */
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
            console.error(`Could not find ${depType} '${targetDep}' of '${dep._dir}'`);
            process.exit(1);
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
 * Given a pkg, return the skylark `filegroup` targets for the package.
 */
function printPackage(pkg) {
  const sources = filterFilesForFilegroup(pkg._files, INCLUDED_FILES);
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
 * Given a scope, return the skylark `filegroup` target for the scope.
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
