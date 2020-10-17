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

// The arguments are passed via a params file
const TARGET_CPU = process.argv[2];
const COMPILATION_MODE = process.argv[3];

// The arguments that were outputted to the params file
const actual = require('fs')
                   .readFileSync(runfiles.resolvePackageRelative('params_file.out'), 'utf-8')
                   .split(/\r?\n/);

// The argument we expect to find in the params file
const expected = [
  'some_value',
  // $execpaths
  './package.json',
  `bazel-out/${TARGET_CPU}-${COMPILATION_MODE}/bin/internal/common/test/foo/bar/a.txt`,
  'internal/common/test/params_file.spec.js',
  // $execpath
  './package.json',
  // $rootpaths
  './package.json',
  'internal/common/test/foo/bar/a.txt',
  'internal/common/test/params_file.spec.js',
  // $rootpath
  './package.json',
  // $locations (expands to runfiles manifest path of format repo/path/to/file)
  'rules_nodejs/package.json',
  'rules_nodejs/internal/common/test/foo/bar/a.txt',
  'rules_nodejs/internal/common/test/params_file.spec.js',
  // $location (expands to runfiles manifest path of format repo/path/to/file)
  'rules_nodejs/package.json',
];

describe('params_file', function() {
  it('should handle args substitutions', function() {
    expect(actual).toEqual(expected);
  });
});
