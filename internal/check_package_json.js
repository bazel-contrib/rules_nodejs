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
'use strict';

const args = process.argv.slice(2);
// The arguments are passed via a params file
const paramsFile = require.resolve('build_bazel_rules_nodejs/' + args[0]);
const [BAZEL_VERSION] = require('fs').readFileSync(paramsFile, 'utf-8').split(/\r?\n/);

const packageJson = require('build_bazel_rules_nodejs/package.json');

// Test that the BAZEL_VERSION defined in //:defs.bzl is in sync with the @bazel/bazel
// version in //:pacakge.json
if (packageJson['devDependencies']['@bazel/bazel'] !== `^${BAZEL_VERSION}`) {
  console.error(`package.json @bazel/bazel '${
      packageJson['devDependencies']
                 ['@bazel/bazel']}' does not match BAZEL_VERSION in //:defs.bzl '${
      BAZEL_VERSION}'`);
  process.exitCode = 1;
}
