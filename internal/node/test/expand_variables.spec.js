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

const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const args = process.argv.slice(2);
const out = JSON.parse(
    require('fs').readFileSync(runfiles.resolveWorkspaceRelative(args.shift()), 'utf-8'));
const expected_args = args;

describe('nodejs_test templated_args variable expansion', function() {
  it('should match variable expansion in npm_package_bin args', function() {
    expect(out.args).toEqual(expected_args);
  });
  it('should match variable expansion in npm_package_bin env vars', function() {
    expect(out.env).toEqual({
      OUTFILE: expected_args[0],
      COMPLATION_MODE: expected_args[1],
      TARGET_CPU: expected_args[2],
      BINDIR: expected_args[3],
      SOME_TEST_ENV: expected_args[4],
      SOMEARG$$: expected_args[5],
      SOME0ARG: expected_args[6],
    })
  });
});
