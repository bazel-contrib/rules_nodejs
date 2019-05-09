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

try {
  require.resolve('shelljs');
} catch (e) {
  // We are in an bazel managed external node_modules repository
  // and the resolve has failed because node did not preserve the symlink
  // when loading the script.
  // This can be fixed using the --preserve-symlinks-main flag which
  // is introduced in node 10.2.0
  throw new Error(
      `Running postinstall-patches.js script in an external repository requires --preserve-symlinks-main node flag introduced in node 10.2.0. ` +
      `Current node version is ${process.version}. Node called with '${process.argv.join(' ')}'.`);
}

const {set, cd, sed, rm} = require('shelljs');
const path = require('path');

// fail on first error
set('-e');
// print commands as being executed
set('-v');
// jump to project root
cd(__dirname);

// Temporary patch to land strict npm deps
console.log(
    '\n# patching ts_library in @bazel/typescript to support strict deps');
sed('-i', 'deps \\= \\[d for d in ctx\\.attr\\.deps if not NodeModuleInfo in d\\],', 'deps = ctx.attr.deps,',
    'node_modules/@bazel/typescript/internal/build_defs.bzl');
