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

const DEBUG = false;

/**
 * The module roots as pairs of a RegExp to match the require path, and a
 * module_root to substitute for the require path.
 * @type {!Array<{module_name: RegExp, module_root: string}>}
 */
var MODULE_ROOTS = [TEMPLATED_module_roots];

/**
 * Array of bootstrap modules that need to be loaded before the entry point.
 */
var BOOTSTRAP = [TEMPLATED_bootstrap];

const USER_WORKSPACE_NAME = 'TEMPLATED_user_workspace_name';
const NODE_MODULES_ROOT = 'TEMPLATED_node_modules_root';

if (DEBUG)
  console.error(`
node_loader: running TEMPLATED_target with
  MODULE_ROOTS: ${MODULE_ROOTS}
  BOOTSTRAP: ${BOOTSTRAP}
  NODE_MODULES_ROOT: ${NODE_MODULES_ROOT}
`);

function resolveToModuleRoot(path) {
  if (!path) {
    throw new Error('resolveToModuleRoot missing path: ' + path);
  }

  var match;
  var lengthOfMatch = 0;
  for (var i = 0; i < MODULE_ROOTS.length; i++) {
    var m = MODULE_ROOTS[i];
    var p = path.replace(m.module_name, m.module_root);
    // Longest regex wins when multiple match
    var len = m.module_name.toString().length;
    if (p !== path && len > lengthOfMatch) {
      lengthOfMatch = len;
      match = p;
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
  const result = Object.create(null);
  const input = fs.readFileSync(manifestPath, {encoding: 'utf-8'});
  for (const line of input.split('\n')) {
    if (!line) continue;
    const [runfilesPath, realPath] = line.split(' ');
    result[runfilesPath] = realPath;
  }
  return result;
}
const runfilesManifest =
    // On Windows, Bazel sets RUNFILES_MANIFEST_ONLY=1.
    // On every platform, Bazel also sets RUNFILES_MANIFEST_FILE, but on Linux
    // and macOS it's faster to use the symlinks in RUNFILES_DIR rather than resolve
    // through the indirection of the manifest file
    process.env.RUNFILES_MANIFEST_ONLY === '1' &&
    loadRunfilesManifest(process.env.RUNFILES_MANIFEST_FILE);

function isFile(res) {
  try {
    return fs.statSync(res).isFile();
  } catch (e) {
    return false;
  }
}

function loadAsFileSync(res) {
  if (isFile(res)) {
    return res;
  }
  if (isFile(res + '.js')) {
    return res;
  }
  return null;
}

function loadAsDirectorySync(res) {
  const pkgfile = path.join(res, 'package.json');
  if (isFile(pkgfile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgfile, 'UTF-8'));
      const main = pkg['main'];
      if (main) {
        if (main === '.' || main === './') {
          main = 'index';
        }

        let maybe = loadAsFileSync(path.resolve(res, main));
        if (maybe) {
          return maybe;
        }

        maybe = loadAsDirectorySync(path.resolve(res, main));
        if (maybe) {
          return maybe;
        }
      }
    } catch (e) {
    }
  }
  return loadAsFileSync(path.resolve(res, 'index'));
}

function resolveManifestFile(res) {
  return runfilesManifest[res] || runfilesManifest[res + '.js'];
}

function resolveManifestDirectory(res) {
  const pkgfile = runfilesManifest[`${res}/package.json`];
  if (pkgfile) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgfile, 'UTF-8'));
      const main = pkg['main'];
      if (main) {
        if (main === '.' || main === './') {
          main = 'index';
        }

        let maybe = resolveManifestFile(path.posix.join(res, main));
        if (maybe) {
          return maybe;
        }

        maybe = resolveManifestDirectory(path.posix.join(res, main));
        if (maybe) {
          return maybe;
        }
      }
    } catch (e) {
    }
  }
  return resolveManifestFile(`${res}/index`)
}

function resolveRunfiles(...pathSegments) {
  // Remove any empty strings from pathSegments
  pathSegments = pathSegments.filter(segment => segment);

  const defaultPath = path.join(process.env.RUNFILES, ...pathSegments);

  if (runfilesManifest) {
    // Normalize to forward slash, because even on Windows the runfiles_manifest file
    // is written with forward slash.
    const runfilesEntry = pathSegments.join('/').replace(/\\/g, '/');
    if (DEBUG) console.error('node_loader: try to resolve in runfiles manifest', runfilesEntry);

    let maybe = resolveManifestFile(runfilesEntry);
    if (maybe) {
      if (DEBUG) console.error('node_loader: resolved manifest file', maybe);
      return maybe;
    }

    maybe = resolveManifestDirectory(runfilesEntry);
    if (maybe) {
      if (DEBUG) console.error('node_loader: resolved via manifest directory', maybe);
      return maybe;
    }
  } else {
    if (DEBUG) console.error('node_loader: try to resolve in runfiles', defaultPath);

    let maybe = loadAsFileSync(defaultPath);
    if (maybe) {
      if (DEBUG) console.error('node_loader: resolved file', maybe);
      return maybe;
    }

    maybe = loadAsDirectorySync(defaultPath);
    if (maybe) {
      if (DEBUG) console.error('node_loader: resolved via directory', maybe);
      return maybe;
    }
  }

  return defaultPath;
}

var originalResolveFilename = module.constructor._resolveFilename;
module.constructor._resolveFilename =
    function(request, parent) {
  if (DEBUG)
    console.error(
        `node_loader: resolve ${request} from ` +
        `${parent && parent.filename ? parent.filename : ''}`);

  const failedResolutions = [];

  // Built-in modules, relative, absolute imports and npm dependencies
  // can be resolved using request
  try {
    const resolved = originalResolveFilename(request, parent);
    if (resolved === request || request.startsWith('.') || request.startsWith('/') ||
        request.match(/^[A-Z]\:[\\\/]/i)) {
      if (DEBUG)
        console.error(
            `node_loader: resolved ${request} to built-in, relative or absolute import ` +
            `${resolved} from ${parent && parent.filename ? parent.filename : ''}`);
      return resolved;
    } else {
      // Resolved is not a built-in module, relative or absolute import
      // but also allow imports within npm packages that are within the parent files
      // node_modules, meaning it is a dependency of the npm package making the import.
      const parentSegments =
          (parent && parent.filename) ? parent.filename.replace(/\\/g, '/').split('/') : [];
      const parentNodeModulesSegment = parentSegments.indexOf('node_modules');
      if (parentNodeModulesSegment != -1) {
        const parentRoot = parentSegments.slice(0, parentNodeModulesSegment).join('/');
        const relative = path.relative(parentRoot, resolved);
        if (!relative.startsWith('..')) {
          // Resolved within parent node_modules
          if (DEBUG)
            console.error(
                `node_loader: resolved ${request} within parent node_modules to ` +
                `${resolved} from ${parent && parent.filename ? parent.filename : ''}`);
          return resolved;
        } else {
          throw new Error(
              `Resolved to ${resolved} outside of parent node_modules ${parent.filename}`);
        }
      }
      throw new Error('Not a built-in module, relative or absolute import');
    }
  } catch (e) {
    failedResolutions.push(`built-in, relative, absolute, nested node_modules - ${e.toString()}`);
  }

  // If the import is not a built-in module, an absolute, relative import or a
  // dependency of an npm package, attempt to resolve against the runfiles location
  try {
    const resolved = originalResolveFilename(resolveRunfiles(request), parent);
    if (DEBUG)
      console.error(
          `node_loader: resolved ${request} within runfiles to ${resolved} from ` +
          `${parent && parent.filename ? parent.filename : ''}`);
    return resolved;
  } catch (e) {
    failedResolutions.push(`runfiles - ${e.toString()}`);
  }

  // If the parent file is from an external repository, attempt to resolve against
  // the external repositories node_modules (if they exist)
  let parentFilename =
      parent && parent.filename ? path.relative(process.env.RUNFILES, parent.filename) : undefined;
  if (parentFilename && !parentFilename.startsWith('..')) {
    // Remove leading USER_WORKSPACE_NAME/external so that external workspace name is
    // always the first segment
    const externalPrefix = `${USER_WORKSPACE_NAME}/external/`;
    if (parentFilename.startsWith(externalPrefix)) {
      parentFilename = parentFilename.substr(externalPrefix.length);
    }
    const parentSegments = parentFilename.split('/');
    if (parentSegments[0] !== USER_WORKSPACE_NAME) {
      try {
        const resolved = originalResolveFilename(
            resolveRunfiles(parentSegments[0], 'node_modules', request), parent);
        if (DEBUG)
          console.error(
              `node_loader: resolved ${request} within node_modules ` +
              `(${parentSegments[0]}/node_modules) to ${resolved} from ` +
              `${parent && parent.filename ? parent.filename : ''}`);
        return resolved;
      } catch (e) {
        failedResolutions.push(`${parentSegments[0]}/node_modules - ${e.toString()}`);
      }
    }
  }

  // If import was not resolved above then attempt to resolve
  // within the node_modules filegroup in use
  try {
    const resolved = originalResolveFilename(resolveRunfiles(NODE_MODULES_ROOT, request), parent);
    if (DEBUG)
      console.error(
          `node_loader: resolved ${request} within node_modules (${NODE_MODULES_ROOT}) to ` +
          `${resolved} from ${parent && parent.filename ? parent.filename : ''}`);
    return resolved;
  } catch (e) {
    failedResolutions.push(`node_modules attribute (${NODE_MODULES_ROOT}) - ${e.toString()}`);
  }

  // Finally, attempt to resolve to module root
  const moduleRoot = resolveToModuleRoot(request);
  if (moduleRoot) {
    const moduleRootInRunfiles = resolveRunfiles(moduleRoot);
    try {
      const filename = module.constructor._findPath(moduleRootInRunfiles, []);
      if (!filename) {
        throw new Error(`No file ${request} found in module root ${moduleRoot}`);
      }
      return filename;
    } catch (e) {
      console.error(`Failed to findPath for ${moduleRootInRunfiles}`);
      throw e;
    }
  }

  const error = new Error(
      `TEMPLATED_target cannot find module '${request}'\n  looked in:` +
      failedResolutions.map(r => `\n   ${r}\n`));
  error.code = 'MODULE_NOT_FOUND';
  throw error;
}

// Before loading anything that might print a stack, install the
// source-map-support.
if (TEMPLATED_install_source_map_support) {
  try {
    require('source-map-support').install();
  } catch (e) {
    console.error(`WARNING: source-map-support module not installed.
    Stack traces from languages like TypeScript will point to generated .js files.
    Set install_source_map_support = False in TEMPLATED_target to turn off this warning.
    `);
  }
}
// Load all bootstrap modules before loading the entrypoint.
for (var i = 0; i < BOOTSTRAP.length; i++) {
  try {
    module.constructor._load(BOOTSTRAP[i], this);
  } catch (e) {
    console.error('bootstrap failure ' + e.stack || e);
    process.exit(1);
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
