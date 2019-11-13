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
const patcher = require('./build/src/index.js');
// todo auto detect bazel env vars instead of adding a new one.
const { BAZEL_PATCH_ROOT, NP_SUBPROCESS_BIN_DIR, VERBOSE_LOGS } = process.env;

if (BAZEL_PATCH_ROOT) {
  if (VERBOSE_LOGS)
    console.log(
      `bazel node patches enabled. root: ${BAZEL_PATCH_ROOT} symlinks in this directory will not escape`
    );
  const fs = require('fs');
  patcher.fs(fs, BAZEL_PATCH_ROOT);
} else if (VERBOSE_LOGS) {
  console.log(`bazel node patches disabled. set environment BAZEL_PATCH_ROOT`);
}

patcher.subprocess(__filename, NP_SUBPROCESS_BIN_DIR);
