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
 * @fileoverview This script runs as a postinstall in the published npm packages
 * and checks that the version of the build_bazel_rules_typescript external
 * repository matches that of the published npm package.
 *
 * Note, this check is only performed with bazel managed deps when the yarn or
 * npm install is from a yarn_install or npm_install repository rule. For self
 * managed bazel deps this check is not performed and it is the responsibility
 * of the user to ensure that the versions match.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const semver = require('semver');

// If this is a bazel managed deps yarn_install or npm_install then the
// cwd is $(bazel info
// output_base)/external/<wksp>/node_modules/@bazel/typescript and there should
// be $(bazel info output_base)/external/<wksp>/generate_build_file.js
// folder
function isBazelManagedDeps() {
  try {
    fs.statSync('../../../generate_build_file.js');
    return true;
  } catch (e) {
    return false;
  }
}

if (isBazelManagedDeps()) {
  let contents;
  try {
    // If this is a yarn_install or npm_install then the cwd is $(bazel info
    // output_base)/external/<wksp>/node_modules/@bazel/<pkg>
    // so we can look for the package.bzl file under $(bazel info
    // output_base)/external/build_bazel_rules_typescript/package.bzl
    const packagePath = path.resolve(
        process.cwd(), '../../../../build_bazel_rules_typescript/package.bzl');
    contents = fs.readFileSync(packagePath, 'utf8');
  } catch (e) {
    throw new Error(
        'The build_bazel_rules_typescript repository is not installed in your Bazel WORKSPACE file');
  }

  // Sanity check that this is build_bazel_rules_typescript since
  // other repos will follow the same pattern and have a VERSION
  // in a root pacakge.bzl file
  if (!contents.includes('def rules_typescript_dependencies():')) {
    throw new Error('Invalid package.bzl in build_bazel_rules_typescript');
  }

  const matchVersion = contents.match(/VERSION \= \"([0-9\.]*)\"/);
  if (!matchVersion) {
    throw new Error('Invalid package.bzl in build_bazel_rules_typescript');
  }

  const bazelPackageVersion = matchVersion[1];
  const bazelPackageVersionRange = `${semver.major(bazelPackageVersion)}.${semver.minor(bazelPackageVersion)}.x`; // should match patch version

  // Should be tolerant of development stamped versions such as "0.17.0-7-g76dc057"
  const npmPackageVersion = process.env.npm_package_version.split('-')[0];

  if (!semver.satisfies(npmPackageVersion, bazelPackageVersionRange)) {
    throw new Error(
        `Expected ${process.env.npm_package_name} version ${npmPackageVersion} to satisfy ${bazelPackageVersionRange}. ` +
        `Please update the build_bazel_rules_typescript version in WORKSPACE file to match ${npmPackageVersion} or ` +
        `update the ${process.env.npm_package_name} version in your package.json to satisfy ${bazelPackageVersionRange}.`);
  }
} else {
  // No version check
  console.warn(
      `WARNING: With self managed deps you must ensure the @bazel/typescript
and @bazel/karma npm package versions match the build_bazel_rules_typescript
repository version. Use yarn_install or npm_install for this version to be checked
automatically.`);
}
