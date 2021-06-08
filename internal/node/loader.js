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
 * @fileoverview NodeJS module loader for bazel.
 */
'use strict';

// Ensure that node is added to the path for any subprocess calls
process.env.PATH = [require('path').dirname(process.execPath), process.env.PATH].join(
    /^win/i.test(process.platform) ? ';' : ':');

if (require.main === module) {
  // Set the actual entry point in the arguments list.
  // argv[0] == node, argv[1] == entry point.
  // NB: 'TEMPLATED_entry_point_path' & 'TEMPLATED_entry_point' below are replaced during the build process.
  var entryPointPath = 'TEMPLATED_entry_point_path';
  var entryPointMain = 'TEMPLATED_entry_point_main';
  var mainScript = process.argv[1] = entryPointMain ? `${entryPointPath}/${entryPointMain}` : entryPointPath;
  try {
    module.constructor._load(mainScript, this, /*isMain=*/true);
  } catch (e) {
    console.error(e.stack || e);
    process.exit(1);
  }
}
