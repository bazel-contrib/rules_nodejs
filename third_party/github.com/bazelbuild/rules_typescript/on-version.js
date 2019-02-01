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
 * @fileoverview This script updates the version in package.bzl to match
 * the version in package.json. It is automatically called during the
 * `npm version` step of the release process (see Releasing in README.me)
 * by the "version" script in package.json.
 */
'use strict';

// Called from "version" npm script when running `npm version`
// during release process. This script updates the version
// in package.bzl to match that of package.json.
const shell = require('shelljs');
const version = require('./package.json').version;
shell.sed('-i', 'VERSION \= \"[0-9\.]*\"', `VERSION = "${version}"`, 'package.bzl')
shell.sed('-i', '\"@bazel/typescript\": \"[0-9\.]*\"', `"@bazel/typescript": "${version}"`, 'README.md')
shell.sed('-i', 'https://github.com/bazelbuild/rules_typescript/archive/[0-9\.]*\.zip', `https://github.com/bazelbuild/rules_typescript/archive/${version}.zip`, 'README.md')
shell.sed('-i', 'strip_prefix \= \"rules_typescript-[0-9\.]*\"', `strip_prefix = "rules_typescript-${version}"`, 'README.md')
