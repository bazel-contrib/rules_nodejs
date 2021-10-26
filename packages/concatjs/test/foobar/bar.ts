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

import {Greeter} from 'build_bazel_rules_nodejs/packages/concatjs/test/foobar/foo';
import {a} from 'build_bazel_rules_nodejs/packages/concatjs/test/generated_ts/foo';
// Repro for #31, should automatically discover @types/node
import * as fs from 'fs';
import {cool} from 'some-lib';
// Verify that typescript/lib/typescript.d.ts and typescript/lib/tsserverlibrary.d.ts
// are available since we must exclude all other typescript/lib/*.d.ts which are
// controlled by the compilerOptions.libs config.
// See https://github.com/bazelbuild/rules_nodejs/pull/875 for more details.
import * as ts from 'typescript';
import * as tss from 'typescript/lib/tsserverlibrary';

import('./foo').then(({greeter}) => {console.log(Greeter, fs, cool, ts, greeter, a);});

const useTssType: tss.server.Project[] = [];
if (useTssType) {
  console.log('foobar');
}
