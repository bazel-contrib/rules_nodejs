/**
 * @fileoverview Patched NodeJS module loader for bazel. This template is
 * expanded to contain module name -> path mappings and then patches the
 * NodeJS require() function to substitute the appropriate paths.
 *
 * @see https://github.com/nodejs/node/blob/master/lib/module.js
 */
'use strict';
var path = require('path');

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

function runfilesDir() {
  return process.env.RUNFILES || process.env.TEST_SRCDIR;
}

var originalResolveFilename = module.constructor._resolveFilename;
module.constructor._resolveFilename =
    function(request, parent) {
  try {
    return originalResolveFilename(request, parent);
  } catch (e) {
  }
  try {
    return originalResolveFilename(path.join(runfilesDir(), request), parent);
  } catch (e) {
  }
  try {
    return originalResolveFilename(
        path.join(
            runfilesDir(), 'TEMPLATED_workspace_name', 'node_modules', request),
        parent);
  } catch (e) {
  }

  var moduleRoot = resolveToModuleRoot(request);
  if (moduleRoot) {
    var moduleRootInRunfiles = path.join(runfilesDir(), moduleRoot);
    var filename = module.constructor._findPath(moduleRootInRunfiles, []);
    if (!filename) {
      throw new Error(`No file ${request} found in module root ${moduleRoot}`);
    }
    return filename;
  }
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
