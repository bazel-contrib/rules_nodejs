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
var __assign = (this && this.__assign) || function() {
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
var fs = require('fs');
var path = require('path');
function log_verbose() {
  var m = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    m[_i] = arguments[_i];
  }
  if (!!process.env['VERBOSE_LOGS'])
    console.error.apply(console, ['[generate_build_file.js]'].concat(m));
}
var BUILD_FILE_HEADER =
    '# Generated file from yarn_install/npm_install rule.\n# See $(bazel info output_base)/external/build_bazel_rules_nodejs/internal/npm_install/generate_build_file.js\n\n# All rules in other repositories can use these targets\npackage(default_visibility = ["//visibility:public"])\n\n';
var args = process.argv.slice(2);
var WORKSPACE = args[0];
var RULE_TYPE = args[1];
var ERROR_ON_BAZEL_FILES = parseInt(args[2]);
var LOCK_FILE_LABEL = args[3];
var INCLUDED_FILES = args[4] ? args[4].split(',') : [];
var DYNAMIC_DEPS = JSON.parse(args[5] || '{}');
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
  var pkgs = findPackages();
  // flatten dependencies
  flattenDependencies(pkgs);
  // generate Bazel workspaces
  generateBazelWorkspaces(pkgs);
  // generate all BUILD files
  generateBuildFiles(pkgs);
}
module.exports = {
  main: main,
  printPackageBin: printPackageBin,
  addDynamicDependencies: addDynamicDependencies,
  printIndexBzl: printIndexBzl
};
/**
 * Generates all build files
 */
function generateBuildFiles(pkgs) {
  generateRootBuildFile(pkgs.filter(function(pkg) {
    return !pkg._isNested;
  }));
  pkgs.filter(function(pkg) {
        return !pkg._isNested;
      })
      .forEach(function(pkg) {
        return generatePackageBuildFiles(pkg);
      });
  findScopes().forEach(function(scope) {
    return generateScopeBuildFiles(scope, pkgs);
  });
}
/**
 * Flattens dependencies on all packages
 */
function flattenDependencies(pkgs) {
  var pkgsMap = new Map();
  pkgs.forEach(function(pkg) {
    return pkgsMap.set(pkg._dir, pkg);
  });
  pkgs.forEach(function(pkg) {
    return flattenPkgDependencies(pkg, pkg, pkgsMap);
  });
}
/**
 * Handles Bazel files in npm distributions.
 */
function hideBazelFiles(pkg) {
  var hasHideBazelFiles = isDirectory('node_modules/@bazel/hide-bazel-files');
  pkg._files = pkg._files.map(function(file) {
    var basename = path.basename(file);
    var basenameUc = basename.toUpperCase();
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
        console.error(
            'npm package \'' + pkg._dir + '\' from @' + WORKSPACE + ' ' + RULE_TYPE +
            ' rule\nhas a Bazel BUILD file \'' + file +
            '\'. Use the @bazel/hide-bazel-files utility to hide these files.\nSee https://github.com/bazelbuild/rules_nodejs/blob/master/packages/hide-bazel-files/README.md\nfor installation instructions.');
        process.exit(1);
      } else {
        // All Bazel files in the npm distribution should be renamed by
        // adding a `_` prefix so that file targets don't cross package boundaries.
        var newFile = path.posix.join(path.dirname(file), '_' + basename);
        var srcPath = path.posix.join('node_modules', pkg._dir, file);
        var dstPath = path.posix.join('node_modules', pkg._dir, newFile);
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
  var exportsStarlark = '';
  pkgs.forEach(function(pkg) {
    pkg._files.forEach(function(f) {
      exportsStarlark += '    "node_modules/' + pkg._dir + '/' + f + '",\n';
    });
  });
  var srcsStarlark = '';
  if (pkgs.length) {
    var list = pkgs.map(function(pkg) {
                     return '"//' + pkg._dir + ':' + pkg._name + '__files",';
                   })
                   .join('\n        ');
    srcsStarlark = '\n    # direct sources listed for strict deps support\n    srcs = [\n        ' +
        list + '\n    ],';
  }
  var depsStarlark = '';
  if (pkgs.length) {
    var list = pkgs.map(function(pkg) {
                     return '"//' + pkg._dir + ':' + pkg._name + '__contents",';
                   })
                   .join('\n        ');
    depsStarlark =
        '\n    # flattened list of direct and transitive dependencies hoisted to root by the package manager\n    deps = [\n        ' +
        list + '\n    ],';
  }
  var buildFile = BUILD_FILE_HEADER +
      ('load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")\n\nexports_files([\n' +
       exportsStarlark +
       '])\n\n# The node_modules directory in one catch-all node_module_library.\n# NB: Using this target may have bad performance implications if\n# there are many files in target.\n# See https://github.com/bazelbuild/bazel/issues/5153.\nnode_module_library(\n    name = "node_modules",' +
       srcsStarlark + depsStarlark + '\n)\n\n');
  // Add the manual build file contents if they exists
  try {
    buildFile += fs.readFileSync('manual_build_file_contents', {encoding: 'utf8'});
  } catch (e) {
  }
  writeFileSync('BUILD.bazel', buildFile);
}
/**
 * Generates all BUILD & bzl files for a package.
 */
function generatePackageBuildFiles(pkg) {
  var buildFile = printPackage(pkg);
  var binBuildFile = printPackageBin(pkg);
  if (binBuildFile.length) {
    writeFileSync(
        path.posix.join(pkg._dir, 'bin', 'BUILD.bazel'), BUILD_FILE_HEADER + binBuildFile);
  }
  var indexFile = printIndexBzl(pkg);
  if (indexFile.length) {
    writeFileSync(path.posix.join(pkg._dir, 'index.bzl'), indexFile);
    buildFile = buildFile + '\n# For integration testing\nexports_files(["index.bzl"])\n';
  }
  writeFileSync(path.posix.join(pkg._dir, 'BUILD.bazel'), BUILD_FILE_HEADER + buildFile);
}
/**
 * Generate install_<workspace_name>.bzl files with function to install each workspace.
 */
function generateBazelWorkspaces(pkgs) {
  var workspaces = {};
  for (var _i = 0, pkgs_1 = pkgs; _i < pkgs_1.length; _i++) {
    var pkg = pkgs_1[_i];
    if (!pkg.bazelWorkspaces) {
      continue;
    }
    for (var _a = 0, _b = Object.keys(pkg.bazelWorkspaces); _a < _b.length; _a++) {
      var workspace = _b[_a];
      // A bazel workspace can only be setup by one npm package
      if (workspaces[workspace]) {
        console.error(
            'Could not setup Bazel workspace ' + workspace + ' requested by npm ' +
            ('package ' + pkg._dir + '@' + pkg.version + '. Already setup by ' +
             workspaces[workspace]));
        process.exit(1);
      }
      generateBazelWorkspace(pkg, workspace);
      // Keep track of which npm package setup this bazel workspace for later use
      workspaces[workspace] = pkg._dir + '@' + pkg.version;
    }
  }
  // Finally generate install_bazel_dependencies.bzl
  generateInstallBazelDependencies(Object.keys(workspaces));
}
/**
 * Generate install_<workspace>.bzl file with function to install the workspace.
 */
function generateBazelWorkspace(pkg, workspace) {
  var bzlFile =
      '# Generated by the yarn_install/npm_install rule\nload("@build_bazel_rules_nodejs//internal/copy_repository:copy_repository.bzl", "copy_repository")\n\ndef _maybe(repo_rule, name, **kwargs):\n    if name not in native.existing_rules():\n        repo_rule(name = name, **kwargs)\n';
  var rootPath = pkg.bazelWorkspaces[workspace].rootPath;
  if (!rootPath) {
    console.error(
        'Malformed bazelWorkspaces attribute in ' + pkg._dir + '@' + pkg.version + '. ' +
        ('Missing rootPath for workspace ' + workspace + '.'));
    process.exit(1);
  }
  // Copy all files for this workspace to a folder under _workspaces
  // to restore the Bazel files which have be renamed from the npm package
  var workspaceSourcePath = path.posix.join('_workspaces', workspace);
  mkdirp(workspaceSourcePath);
  pkg._files.forEach(function(file) {
    if (/^node_modules[/\\]/.test(file)) {
      // don't copy over nested node_modules
      return;
    }
    var destFile = path.relative(rootPath, file);
    if (destFile.startsWith('..')) {
      // this file is not under the rootPath
      return;
    }
    var basename = path.basename(file);
    var basenameUc = basename.toUpperCase();
    // Bazel BUILD files from npm distribution would have been renamed earlier with a _ prefix so
    // we restore the name on the copy
    if (basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL') {
      destFile = path.posix.join(path.dirname(destFile), basename.substr(1));
    }
    var src = path.posix.join('node_modules', pkg._dir, file);
    var dest = path.posix.join(workspaceSourcePath, destFile);
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
  bzlFile += 'def install_' + workspace +
      '():\n    _maybe(\n        copy_repository,\n        name = "' + workspace +
      '",\n        marker_file = "@' + WORKSPACE + '//_workspaces/' + workspace +
      ':_bazel_workspace_marker",\n        # Ensure that changes to the node_modules cause the copy to re-execute\n        lock_file = "@' +
      WORKSPACE + LOCK_FILE_LABEL + '",\n    )\n';
  writeFileSync('install_' + workspace + '.bzl', bzlFile);
}
/**
 * Generate install_bazel_dependencies.bzl with function to install all workspaces.
 */
function generateInstallBazelDependencies(workspaces) {
  var bzlFile = '# Generated by the yarn_install/npm_install rule\n';
  workspaces.forEach(function(workspace) {
    bzlFile += 'load(":install_' + workspace + '.bzl", "install_' + workspace + '")\n';
  });
  bzlFile +=
      'def install_bazel_dependencies():\n    """Installs all workspaces listed in bazelWorkspaces of all npm packages"""\n';
  workspaces.forEach(function(workspace) {
    bzlFile += '    install_' + workspace + '()\n';
  });
  writeFileSync('install_bazel_dependencies.bzl', bzlFile);
}
/**
 * Generate build files for a scope.
 */
function generateScopeBuildFiles(scope, pkgs) {
  var buildFile = BUILD_FILE_HEADER + printScope(scope, pkgs);
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
function listFiles(rootDir, subDir) {
  if (subDir === void 0) {
    subDir = '';
  }
  var dir = path.posix.join(rootDir, subDir);
  if (!isDirectory(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
      .reduce(
          function(files, file) {
            var fullPath = path.posix.join(dir, file);
            var relPath = path.posix.join(subDir, file);
            var isSymbolicLink = fs.lstatSync(fullPath).isSymbolicLink();
            var stat;
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
            var isDirectory = stat.isDirectory();
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
      // Files with spaces (\x20) or unicode characters (<\x20 && >\x7E) are not allowed in
      // Bazel runfiles. See https://github.com/bazelbuild/bazel/issues/4327
      .filter(function(f) {
        return !/[^\x21-\x7E]/.test(f);
      })
      // We return a sorted array so that the order of files
      // is the same regardless of platform
      .sort();
}
/**
 * Returns true if the npm package distribution contained a
 * root /BUILD or /BUILD.bazel file.
 */
function hasRootBuildFile(pkg, rootPath) {
  for (var _i = 0, _a = pkg._files; _i < _a.length; _i++) {
    var file = _a[_i];
    // Bazel files would have been renamed earlier with a `_` prefix
    var fileUc = path.relative(rootPath, file).toUpperCase();
    if (fileUc === '_BUILD' || fileUc === '_BUILD.BAZEL') {
      return true;
    }
  }
  return false;
}
function addDynamicDependencies(pkgs, dynamic_deps) {
  if (dynamic_deps === void 0) {
    dynamic_deps = DYNAMIC_DEPS;
  }
  pkgs.forEach(function(p) {
    function match(name) {
      // Automatically include dynamic dependency on plugins of the form pkg-plugin-foo
      if (name.startsWith(p._moduleName + '-plugin-')) return true;
      var value = dynamic_deps[p._moduleName];
      if (name === value) return true;
      // Support wildcard match
      if (value && value.includes('*') && name.startsWith(value.substring(0, value.indexOf('*')))) {
        return true;
      }
      return false;
    }
    p._dynamicDependencies = pkgs.filter(function(x) {
                                   return !!x._moduleName && match(x._moduleName);
                                 })
                                 .map(function(dyn) {
                                   return '//' + dyn._dir + ':' + dyn._name;
                                 });
  });
}
/**
 * Finds and returns an array of all packages under a given path.
 */
function findPackages(p) {
  if (p === void 0) {
    p = 'node_modules';
  }
  if (!isDirectory(p)) {
    return [];
  }
  var pkgs = [];
  var listing = fs.readdirSync(p);
  var packages = listing
                     // filter out scopes
                     .filter(function(f) {
                       return !f.startsWith('@');
                     })
                     // filter out folders such as `.bin` which can create
                     // issues on Windows since these are "hidden" by default
                     .filter(function(f) {
                       return !f.startsWith('.');
                     })
                     .map(function(f) {
                       return path.posix.join(p, f);
                     })
                     .filter(function(f) {
                       return isDirectory(f);
                     });
  packages.forEach(function(f) {
    return pkgs.push.apply(
        pkgs, [parsePackage(f)].concat(findPackages(path.posix.join(f, 'node_modules'))));
  });
  var scopes = listing
                   .filter(function(f) {
                     return f.startsWith('@');
                   })
                   .map(function(f) {
                     return path.posix.join(p, f);
                   })
                   .filter(function(f) {
                     return isDirectory(f);
                   });
  scopes.forEach(function(f) {
    return pkgs.push.apply(pkgs, findPackages(f));
  });
  addDynamicDependencies(pkgs);
  return pkgs;
}
/**
 * Finds and returns an array of all package scopes in node_modules.
 */
function findScopes() {
  var p = 'node_modules';
  if (!isDirectory(p)) {
    return [];
  }
  var listing = fs.readdirSync(p);
  var scopes = listing
                   .filter(function(f) {
                     return f.startsWith('@');
                   })
                   .map(function(f) {
                     return path.posix.join(p, f);
                   })
                   .filter(function(f) {
                     return isDirectory(f);
                   })
                   .map(function(f) {
                     return f.replace(/^node_modules\//, '');
                   });
  return scopes;
}
/**
 * Given the name of a top-level folder in node_modules, parse the
 * package json and return it as an object along with
 * some additional internal attributes prefixed with '_'.
 */
function parsePackage(p) {
  // Parse the package.json file of this package
  var packageJson = path.posix.join(p, 'package.json');
  var pkg = isFile(packageJson) ? JSON.parse(fs.readFileSync(packageJson, {encoding: 'utf8'})) :
                                  {version: '0.0.0'};
  // Trim the leading node_modules from the path and
  // assign to _dir for future use
  pkg._dir = p.replace(/^node_modules\//, '');
  // Stash the package directory name for future use
  pkg._name = pkg._dir.split('/').pop();
  // Module name of the package. Unlike "_name" this represents the
  // full package name (including scope name).
  pkg._moduleName = pkg.name || pkg._dir + '/' + pkg._name;
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
      Object.values(entry)
          .filter(function(_entry) {
            return isValidBinPath(_entry);
          })
          .length > 0;
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
  var cleanPath = cleanupEntryPointPath(path);
  // check if main entry point exists
  var entryFile = findFile(pkg, cleanPath) || findFile(pkg, cleanPath + '.js');
  if (!entryFile) {
    // If entryPoint entry point listed could not be resolved to a file
    // This can happen
    // in some npm packages that list an incorrect main such as v8-coverage@1.0.8
    // which lists `"main": "index.js"` but that file does not exist.
    log_verbose(
        'could not find entry point for the path ' + cleanPath + ' given by npm package ' +
        pkg._name);
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
  var mainEntryField = pkg[mainFileName];
  if (mainEntryField) {
    if (typeof mainEntryField === 'string') {
      return findEntryFile(pkg, mainEntryField);
    } else if (typeof mainEntryField === 'object' && mainFileName === 'browser') {
      // browser has a weird way of defining this
      // the browser value is an object listing files to alias, usually pointing to a browser dir
      var indexEntryPoint = mainEntryField['index.js'] || mainEntryField['./index.js'];
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
  var mainFileNames = ['browser', 'module', 'main'];
  for (var _i = 0, mainFileNames_1 = mainFileNames; _i < mainFileNames_1.length; _i++) {
    var mainFile = mainFileNames_1[_i];
    var resolvedMainFile = resolveMainFile(pkg, mainFile);
    if (resolvedMainFile) {
      return resolvedMainFile;
    }
  }
  // if we cant find any correct file references from the pkg
  // then we just try looking around for common patterns
  var maybeRootIndex = findEntryFile(pkg, 'index.js');
  if (maybeRootIndex) {
    return maybeRootIndex;
  }
  var maybeSelfNamedIndex = findEntryFile(pkg, pkg._name + '.js');
  if (maybeSelfNamedIndex) {
    return maybeSelfNamedIndex;
  }
  // none of the methods we tried resulted in a file
  log_verbose('could not find entry point for npm package ' + pkg._name);
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
  var findDeps = function(targetDeps, required, depType) {
    Object.keys(targetDeps || {})
        .map(function(targetDep) {
          var _a;
          // look for matching nested package
          var dirSegments = dep._dir.split('/');
          while (dirSegments.length) {
            var maybe =
                (_a = path.posix).join.apply(_a, dirSegments.concat(['node_modules', targetDep]));
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
            console.error(
                'could not find ' + depType + ' \'' + targetDep + '\' of \'' + dep._dir + '\'');
            process.exit(1);
          }
          return null;
        })
        .filter(function(dep) {
          return !!dep;
        })
        .map(function(dep) {
          return flattenPkgDependencies(pkg, dep, pkgsMap);
        });
  };
  // npm will in some cases add optionalDependencies to the list
  // of dependencies to the package.json it writes to node_modules.
  // We delete these here if they exist as they may result
  // in expected dependencies that are not found.
  if (dep.dependencies && dep.optionalDependencies) {
    Object.keys(dep.optionalDependencies).forEach(function(optionalDep) {
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
  var cloned = __assign({}, pkg);
  cloned._dependencies = cloned._dependencies.map(function(dep) {
    return dep._dir;
  });
  delete cloned._files;
  return JSON.stringify(cloned, null, 2)
      .split('\n')
      .map(function(line) {
        return '# ' + line;
      })
      .join('\n');
}
/**
 * A filter function for files in an npm package. Comparison is case-insensitive.
 * @param files array of files to filter
 * @param exts list of white listed case-insensitive extensions; if empty, no filter is
 *             done on extensions; '' empty string denotes to allow files with no extensions,
 *             other extensions are listed with '.ext' notation such as '.d.ts'.
 */
function filterFiles(files, exts) {
  if (exts === void 0) {
    exts = [];
  }
  if (exts.length) {
    var allowNoExts_1 = exts.includes('');
    files = files.filter(function(f) {
      // include files with no extensions if noExt is true
      if (allowNoExts_1 && !path.extname(f)) return true;
      // filter files in exts
      var lc = f.toLowerCase();
      for (var _i = 0, exts_1 = exts; _i < exts_1.length; _i++) {
        var e = exts_1[_i];
        if (e && lc.endsWith(e.toLowerCase())) {
          return true;
        }
      }
      return false;
    });
  }
  // Filter out BUILD files that came with the npm package
  return files.filter(function(file) {
    var basenameUc = path.basename(file).toUpperCase();
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
  var set = new Set(pkg._files);
  if (set.has('ANGULAR_PACKAGE')) {
    // This file is used by the npm/yarn_install rule to detect APF. See
    // https://github.com/bazelbuild/rules_nodejs/issues/927
    return true;
  }
  var metadataExt = /\.metadata\.json$/;
  return pkg._files.some(function(file) {
    if (metadataExt.test(file)) {
      var sibling = file.replace(metadataExt, '.d.ts');
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
  var ml = m.toLowerCase();
  for (var _i = 0, _a = pkg._files; _i < _a.length; _i++) {
    var f = _a[_i];
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
  var sources = filterFiles(pkg._files, INCLUDED_FILES);
  var dtsSources = filterFiles(pkg._files, ['.d.ts']);
  // TODO(gmagolan): add UMD & AMD scripts to scripts even if not an APF package _but_ only if they
  // are named?
  var scripts = getNgApfScripts(pkg);
  var deps = [pkg].concat(pkg._dependencies.filter(function(dep) {
    return dep !== pkg && !dep._isNested;
  }));
  var scriptStarlark = '';
  if (scripts.length) {
    scriptStarlark =
        '\n    # subset of srcs that are javascript named-UMD or named-AMD scripts\n    scripts = [\n        ' +
        scripts
            .map(function(f) {
              return '"//:node_modules/' + pkg._dir + '/' + f + '",';
            })
            .join('\n        ') +
        '\n    ],';
  }
  var srcsStarlark = '';
  if (sources.length) {
    srcsStarlark = '\n    # ' + pkg._dir +
        ' package files (and files in nested node_modules)\n    srcs = [\n        ' +
        sources
            .map(function(f) {
              return '"//:node_modules/' + pkg._dir + '/' + f + '",';
            })
            .join('\n        ') +
        '\n    ],';
  }
  var depsStarlark = '';
  if (deps.length) {
    var list = deps.map(function(dep) {
                     return '"//' + dep._dir + ':' + dep._name + '__contents",';
                   })
                   .join('\n        ');
    depsStarlark =
        '\n    # flattened list of direct and transitive dependencies hoisted to root by the package manager\n    deps = [\n        ' +
        list + '\n    ],';
  }
  var dtsStarlark = '';
  if (dtsSources.length) {
    dtsStarlark = '\n    # ' + pkg._dir +
        ' package declaration files (and declaration files in nested node_modules)\n    srcs = [\n        ' +
        dtsSources
            .map(function(f) {
              return '"//:node_modules/' + pkg._dir + '/' + f + '",';
            })
            .join('\n        ') +
        '\n    ],';
  }
  var result =
      'load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")\n\n# Generated targets for npm package "' +
      pkg._dir + '"\n' + printJson(pkg) + '\n\nfilegroup(\n    name = "' + pkg._name + '__files",' +
      srcsStarlark + '\n)\n\nnode_module_library(\n    name = "' + pkg._name +
      '",\n    # direct sources listed for strict deps support\n    srcs = [":' + pkg._name +
      '__files"],' + depsStarlark + '\n)\n\n# ' + pkg._name +
      '__contents target is used as dep for main targets to prevent\n# circular dependencies errors\nnode_module_library(\n    name = "' +
      pkg._name + '__contents",\n    srcs = [":' + pkg._name + '__files"],' + scriptStarlark +
      '\n)\n\n# ' + pkg._name + '__typings is the subset of ' + pkg._name +
      '__contents that are declarations\nnode_module_library(\n    name = "' + pkg._name +
      '__typings",' + dtsStarlark + '\n)\n\n';
  var mainEntryPoint = resolvePkgMainFile(pkg);
  // add an `npm_umd_bundle` target to generate an UMD bundle if one does
  // not exists
  if (mainEntryPoint && !findFile(pkg, pkg._name + '.umd.js')) {
    result +=
        'load("@build_bazel_rules_nodejs//internal/npm_install:npm_umd_bundle.bzl", "npm_umd_bundle")\n\nnpm_umd_bundle(\n    name = "' +
        pkg._name + '__umd",\n    package_name = "' + pkg._name +
        '",\n    entry_point = "//:node_modules/' + pkg._dir + '/' + mainEntryPoint +
        '",\n    package = ":' + pkg._name + '",\n)\n\n';
  }
  return result;
}
function _findExecutables(pkg) {
  var executables = new Map();
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
        for (var key in pkg.bin) {
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
  var additionalAttributes = '';
  if (pkg.bazelBin && pkg.bazelBin[name] && pkg.bazelBin[name].additionalAttributes) {
    var attrs = pkg.bazelBin[name].additionalAttributes;
    for (var _i = 0, _a = Object.keys(attrs); _i < _a.length; _i++) {
      var attrName = _a[_i];
      var attrValue = attrs[attrName];
      additionalAttributes += '\n    ' + attrName + ' = ' + attrValue + ',';
    }
  }
  return additionalAttributes;
}
/**
 * Given a pkg, return the skylark nodejs_binary targets for the package.
 */
function printPackageBin(pkg) {
  var result = '';
  var executables = _findExecutables(pkg);
  if (executables.size) {
    result = 'load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")\n\n';
    var data = ['//' + pkg._dir + ':' + pkg._name];
    if (pkg._dynamicDependencies) {
      data.push.apply(data, pkg._dynamicDependencies);
    }
    for (var _i = 0, _a = executables.entries(); _i < _a.length; _i++) {
      var _b = _a[_i], name_1 = _b[0], path_1 = _b[1];
      result += '# Wire up the `bin` entry `' + name_1 + '`\nnodejs_binary(\n    name = "' +
          name_1 + '",\n    entry_point = "//:node_modules/' + pkg._dir + '/' + path_1 +
          '",\n    install_source_map_support = False,\n    data = [' +
          data.map(function(p) {
                return '"' + p + '"';
              })
              .join(', ') +
          '],' + additionalAttributes(pkg, name_1) + '\n)\n\n';
    }
  }
  return result;
}
function printIndexBzl(pkg) {
  var result = '';
  var executables = _findExecutables(pkg);
  if (executables.size) {
    result =
        'load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "npm_package_bin")\n\n';
    var data = ['@' + WORKSPACE + '//' + pkg._dir + ':' + pkg._name];
    if (pkg._dynamicDependencies) {
      data.push.apply(data, pkg._dynamicDependencies);
    }
    for (var _i = 0, _a = executables.entries(); _i < _a.length; _i++) {
      var _b = _a[_i], name_2 = _b[0], path_2 = _b[1];
      result = result + '\n\n# Generated helper macro to call ' + name_2 + '\ndef ' +
          name_2.replace(/-/g, '_') +
          '(**kwargs):\n    output_dir = kwargs.pop("output_dir", False)\n    if "outs" in kwargs or output_dir:\n        npm_package_bin(tool = "@' +
          WORKSPACE + '//' + pkg._dir + '/bin:' + name_2 +
          '", output_dir = output_dir, **kwargs)\n    else:\n        nodejs_binary(\n            entry_point = "@' +
          WORKSPACE + '//:node_modules/' + pkg._dir + '/' + path_2 +
          '",\n            install_source_map_support = False,\n            data = [' +
          data.map(function(p) {
                return '"' + p + '"';
              })
              .join(', ') +
          '] + kwargs.pop("data", []),' + additionalAttributes(pkg, name_2) +
          '\n            **kwargs\n        )\n  ';
    }
  }
  return result;
}
/**
 * Given a scope, return the skylark `node_module_library` target for the scope.
 */
function printScope(scope, pkgs) {
  pkgs = pkgs.filter(function(pkg) {
    return !pkg._isNested && pkg._dir.startsWith(scope + '/');
  });
  var deps = [];
  pkgs.forEach(function(pkg) {
    deps = deps.concat(pkg._dependencies.filter(function(dep) {
      return !dep._isNested && !pkgs.includes(pkg);
    }));
  });
  // filter out duplicate deps
  deps = pkgs.concat(new Set(deps));
  var srcsStarlark = '';
  if (deps.length) {
    var list = deps.map(function(dep) {
                     return '"//' + dep._dir + ':' + dep._name + '__files",';
                   })
                   .join('\n        ');
    srcsStarlark = '\n    # direct sources listed for strict deps support\n    srcs = [\n        ' +
        list + '\n    ],';
  }
  var depsStarlark = '';
  if (deps.length) {
    var list = deps.map(function(dep) {
                     return '"//' + dep._dir + ':' + dep._name + '__contents",';
                   })
                   .join('\n        ');
    depsStarlark =
        '\n    # flattened list of direct and transitive dependencies hoisted to root by the package manager\n    deps = [\n        ' +
        list + '\n    ],';
  }
  return 'load("@build_bazel_rules_nodejs//internal/npm_install:node_module_library.bzl", "node_module_library")\n\n# Generated target for npm scope ' +
      scope + '\nnode_module_library(\n    name = "' + scope + '",' + srcsStarlark + depsStarlark +
      '\n)\n\n';
}
