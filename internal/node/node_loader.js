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

// Ensure that node is added to the path for any subprocess calls
process.env.PATH = [path.dirname(process.execPath), process.env.PATH].join(path.delimiter);

const DEBUG = false;

/**
 * Array of bootstrap modules that need to be loaded before the entry point.
 */
var BOOTSTRAP = [TEMPLATED_bootstrap];

const NODE_MODULES_ROOT = 'TEMPLATED_node_modules_root';
const ENTRY_POINT = 'TEMPLATED_entry_point';
const INSTALL_SOURCE_MAP_SUPPORT = TEMPLATED_install_source_map_support;
const TARGET = 'TEMPLATED_target';

if (DEBUG)
  console.error(`
node_loader: running ${TARGET} with
  cwd: ${process.cwd()}
  runfiles: ${process.env.RUNFILES}

  BOOTSTRAP: ${JSON.stringify(BOOTSTRAP, undefined, 2)}
  ENTRY_POINT: ${ENTRY_POINT}
  INSTALL_SOURCE_MAP_SUPPORT: ${INSTALL_SOURCE_MAP_SUPPORT}
  NODE_MODULES_ROOT: ${NODE_MODULES_ROOT}
  TARGET: ${TARGET}
`);

// Before loading anything that might print a stack, install the
// source-map-support.
if (INSTALL_SOURCE_MAP_SUPPORT) {
  try {
    const sourcemap_support_package = path.resolve(process.cwd(),
          '../build_bazel_rules_nodejs/third_party/github.com/source-map-support');
    require(sourcemap_support_package).install();
  } catch (_) {
    if (DEBUG) {
      console.error(`WARNING: source-map-support module not installed.
      Stack traces from languages like TypeScript will point to generated .js files.
      Set install_source_map_support = False in ${TARGET} to turn off this warning.
      `);
    }
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
  var mainScript = process.argv[1] = ENTRY_POINT;
  try {
    module.constructor._load(mainScript, this, /*isMain=*/true);
  } catch (e) {
    console.error(e.stack || e);
    if (NODE_MODULES_ROOT === 'build_bazel_rules_nodejs/node_modules') {
      // This error is possibly due to a breaking change in 0.13.0 where
      // the default node_modules attribute of nodejs_binary was changed
      // from @//:node_modules to @build_bazel_rules_nodejs//:node_modules_none
      // (which is an empty filegroup).
      // See https://github.com/bazelbuild/rules_nodejs/wiki#migrating-to-rules_nodejs-013
      console.error(
          `\nWARNING: Due to a breaking change in rules_nodejs 0.13.0, target ${TARGET}\n` +
          `must now declare either an explicit node_modules attribute, or\n` +
          `list explicit deps[] or data[] fine grained dependencies on npm labels\n` +
          `if it has any node_modules dependencies.\n` +
          `See https://github.com/bazelbuild/rules_nodejs/wiki#migrating-to-rules_nodejs-013\n`);
    }
    process.exit(1);
  }
}
