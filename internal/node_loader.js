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
 * @fileoverview Patched NodeJS module loader for bazel. This template is
 * expanded to contain module name -> path mappings and then patches the
 * NodeJS require() function to substitute the appropriate paths.
 *
 * @see https://github.com/nodejs/node/blob/master/lib/module.js
 */
'use strict';
var path = require('path');
var fs = require('fs');

/**
 * The module roots as pairs of a RegExp to match the require path, and a
 * module_root to substitute for the require path.
 * @type {!Array<{module_name: RegExp, module_root: string}>}
 */
var MODULE_ROOTS = [TEMPLATED_module_roots];

function resolveToModuleRoot(path) {
  if (!path) {
    throw new Error('resolveToModuleRoot missing path: ' + path);
  }

  var match;
  var lengthOfMatch = 0;
  var matchedEntry;
  for (var i = 0; i < MODULE_ROOTS.length; i++) {
    var m = MODULE_ROOTS[i];
    var p = path.replace(m.module_name, m.module_root);
    // Longest regex wins when multiple match
    var len = m.module_name.toString().length;
    if (p !== path && len > lengthOfMatch) {
      lengthOfMatch = len;
      match = p;
      matchedEntry = m;
    }
  }
  if (match) {
    return match;
  }
  return null;
}

/**
 * The runfiles manifest maps from short_path
 * https://docs.bazel.build/versions/master/skylark/lib/File.html#short_path
 * to the actual location on disk where the file can be read.
 *
 * In a sandboxed execution, it does not exist. In that case, runfiles must be
 * resolved from a symlink tree under the runfiles dir.
 * See https://github.com/bazelbuild/bazel/issues/3726
 */
function loadRunfilesManifest(manifestPath) {
  // If the runfiles directory doesn't exist, we're not running on Windows.
  if (!fs.existsSync(manifestPath)) {
    return;
  }
  const result = Object.create(null);
  const input = fs.readFileSync(manifestPath, {encoding: 'utf-8'});
  for (const line of input.split("\n")) {
    if (!line) continue;
    const [runfilesPath, realPath] = line.split(" ");
    result[runfilesPath] = realPath;
  }
  return result;
}
const runfilesManifest = loadRunfilesManifest(`${process.env.RUNFILES}/MANIFEST`);

function resolveRunfiles(...pathSegments) {
  if (runfilesManifest) {
    // Join on forward slash, because even on Windows the runfiles_manifest
    // file is written with forward slash.
    const runfilesEntry = pathSegments.filter(s => !!s).join('/');
    // Add .js as a workaround for https://github.com/bazelbuild/rules_nodejs/issues/25
    return runfilesManifest[runfilesEntry] || runfilesManifest[runfilesEntry + '.js'];
  } else {
    return path.join(process.env.RUNFILES, ...pathSegments);
  }
}

var originalResolveFilename = module.constructor._resolveFilename;
module.constructor._resolveFilename =
    function(request, parent) {
  var failedResolutions = [];
  var resolveLocations = [
    request,
    resolveRunfiles(request),
    resolveRunfiles(
      'TEMPLATED_workspace_name', 'TEMPLATED_label_package',
      'node_modules', request),
  ];
  for (var location of resolveLocations) {
    try {
      return originalResolveFilename(location, parent);
    } catch (e) {
      failedResolutions.push(location);
    }
  }

  var moduleRoot = resolveToModuleRoot(request);
  if (moduleRoot) {
    var moduleRootInRunfiles = resolveRunfiles(moduleRoot);
    try {
      var filename = module.constructor._findPath(moduleRootInRunfiles, []);
      if (!filename) {
        throw new Error(`No file ${request} found in module root ${moduleRoot}`);
      }
      return filename;
    } catch (e) {
      console.error(`Failed to findPath for ${moduleRootInRunfiles}`);
      throw e;
    }
  }
  var error = new Error(`Cannot find module '${request}'\n  looked in:` +
    failedResolutions.map(r => '\n   ' + r));
  error.code = 'MODULE_NOT_FOUND';
  throw error;
}

if (require.main === module) {
  // Set the actual entry point in the arguments list.
  // argv[0] == node, argv[1] == entry point.
  // NB: entry_point below is replaced during the build process.
  var mainScript = process.argv[1] = 'TEMPLATED_entry_point';
  try {
    module.constructor._load(mainScript, this, /*isMain=*/true);
  } catch (e) {
    console.error('failed to load main ', e.stack || e);
    process.exit(1);
  }
}
