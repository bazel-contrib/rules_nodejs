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
const [a1, a2] = require('fs').readFileSync(args[0], 'utf-8').split(/\r?\n/);

const a1_exp = './package.json';
const a2_exp = './package.json internal/common/test/check_params_file.js';

if (a1 !== a1_exp) {
  console.error(`expected first argument in params file to be '${a1_exp}'`)
  process.exit(1);
}

if (a2 !== a2_exp) {
  console.error(`expected second argument in params file to be '${a2_exp}'`)
  process.exit(1);
}
