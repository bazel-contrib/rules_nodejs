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
 * @fileoverview This script processes the user's package.json file
 * which is named _package.json in the install context and removes
 * packages that are listed in the exclude_packages attribute
 * which are passed to this script as the first argument.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const removePackages = args[0] ? args[0].split(',') : [];

if (require.main === module) {
  main();
}

/**
 * Main entrypoint.
 */
function main() {
  const pkg = JSON.parse(fs.readFileSync('_package.json', {encoding: 'utf8'}));

  removePackages.forEach(p => {
    if (pkg.dependencies) {
      delete pkg.dependencies[p];
    }
    if (pkg.devDependencies) {
      delete pkg.devDependencies[p];
    }
    if (pkg.peerDependencies) {
      delete pkg.peerDependencies[p];
    }
    if (pkg.optionalDependencies) {
      delete pkg.optionalDependencies[p];
    }
  });

  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
}

module.exports = {main};
