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

const path = require('path');
const fs = require('fs');

/**
 * Returns an array of all BUILD the files under a directory as relative
 * paths to the directory.
 */
function listBuildFiles(rootDir, subDir = '') {
  const dir = path.posix.join(rootDir, subDir);
  return fs.readdirSync(dir).reduce((files, file) => {
    const fullPath = path.posix.join(dir, file);
    const relPath = path.posix.join(subDir, file);
    const isDirectory = fs.statSync(fullPath).isDirectory();
    if (isDirectory) {
      return files.concat(listBuildFiles(rootDir, relPath));
    } else if (file === 'BUILD' || file === 'BUILD.bazel') {
      return files.concat(relPath);
    } else {
      return files;
    }
  }, []);
}

function addTarget(buildFile, buildFiles) {
  let buildFileContents = fs.readFileSync(buildFile, {encoding: 'utf-8'});
  const deps = [];
  const buildFileDepth = buildFile.split('/').length;
  for (const maybe of buildFiles) {
    if (maybe === buildFile) {
      continue;
    }
    const maybeSegments = maybe.split('/').slice(0, -1);
    const maybeDepth = maybeSegments.length;
    if (maybeDepth === buildFileDepth) {
      deps.push(`//${maybeSegments.join('/')}:bazel_integration_test_files`);
    }
  }
  buildFileContents += `
filegroup(
    name = "bazel_integration_test_files",
    srcs = glob(["**/*"]) + [${deps.map(d => `"${d}"`).join(', ')}],
    visibility = ["//visibility:public"],
)`
  fs.writeFileSync(buildFile, buildFileContents);
}

const buildFiles = listBuildFiles(process.cwd());
for (const buildFile of buildFiles) {
  addTarget(buildFile, buildFiles);
}
