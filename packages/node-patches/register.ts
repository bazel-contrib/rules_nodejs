/**
 * @license
 * Copyright 2019 The Bazel Authors. All rights reserved.
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
 * @fileoverview Description of this file.
 */
const patcher = require('./src');
const {BAZEL_PATCH_ROOT, BAZEL_PATCH_GUARDS, NP_SUBPROCESS_NODE_DIR, VERBOSE_LOGS} = process.env;

if (BAZEL_PATCH_ROOT) {
  const guards = BAZEL_PATCH_GUARDS ? BAZEL_PATCH_GUARDS.split(',') : [];
  if (VERBOSE_LOGS)
    console.error(`bazel node patches enabled. root: ${
        BAZEL_PATCH_ROOT} symlinks in this directory will not escape`);
  const fs = require('fs');
  patcher.fs(fs, BAZEL_PATCH_ROOT, guards);
} else if (VERBOSE_LOGS) {
  console.error(`bazel node patches disabled. set environment BAZEL_PATCH_ROOT`);
}

patcher.subprocess(__filename, NP_SUBPROCESS_NODE_DIR);
