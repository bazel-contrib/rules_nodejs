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
const child_process = require('child_process');

const DEBUG = false;

const args = process.argv.slice(2);
const packageManager = args[0];
const excludePackages = args[1] ? args[1].split(',') : [];

if (require.main === module) {
  main();
}

/**
 * Main entrypoint.
 */
function main() {
  const isYarn = (packageManager === 'yarn');

  const pkg = JSON.parse(fs.readFileSync('_package.json', {encoding: 'utf8'}));

  if (DEBUG) console.error(`Pre-processing package.json`);

  removeExcludedPackages(pkg);

  if (isYarn) {
    // Work-around for https://github.com/yarnpkg/yarn/issues/2165
    // Note: there is no equivalent npm functionality to clean out individual packages
    // from the npm cache.
    clearYarnFilePathCaches(pkg);
  }

  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
}

function removeExcludedPackages(pkg) {
  excludePackages.forEach(p => {
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
}

/**
 * Runs `yarn cache clean` for all packages that have `file://` URIs.
 * Work-around for https://github.com/yarnpkg/yarn/issues/2165.
 */
function clearYarnFilePathCaches(pkg) {
  const fileRegex = /^file\:\/\//i;
  const clearPackages = [];

  if (pkg.dependencies) {
    Object.keys(pkg.dependencies).forEach(p => {
      if (pkg.dependencies[p].match(fileRegex)) {
        clearPackages.push(p);
      }
    });
  }
  if (pkg.devDependencies) {
    Object.keys(pkg.devDependencies).forEach(p => {
      if (pkg.devDependencies[p].match(fileRegex)) {
        clearPackages.push(p);
      }
    });
  }
  if (pkg.optionalDependencies) {
    Object.keys(pkg.optionalDependencies).forEach(p => {
      if (pkg.optionalDependencies[p].match(fileRegex)) {
        clearPackages.push(p);
      }
    });
  }

  if (clearPackages.length) {
    if (DEBUG) console.error(`Cleaning packages from yarn cache: ${clearPackages.join(' ')}`);

    child_process.execFileSync(
        'yarn', ['cache', 'clean'].concat(clearPackages),
        {stdio: [process.stdin, process.stdout, process.stderr]});
  }
}

module.exports = {main};
