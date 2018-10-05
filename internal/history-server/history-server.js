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

const fs = require('fs');
const path = require('path');
const {createServer} = require('history-server');

function getArg(argv, flag, defaultValue) {
  const index = argv.indexOf(flag);
  return index === -1 ? defaultValue : argv[index + 1];
}

function startServer(rootDir, port) {
  // index.html might be generated, so it could be in bazel-bin or bazel-genfiles
  // We use require.resolve to find the directory containing it
  const indexPath = require.resolve(path.join(rootDir, 'index.html'));

  const config = [{path: '/', root: path.dirname(indexPath)}];
  const manifestFile = process.env['RUNFILES_MANIFEST_FILE'];
  if (manifestFile) {
    const manifest = fs.readFileSync(manifestFile, {encoding: 'utf-8'})
    .split(/\r?\n/).filter(f => !!f);
    console.error(Object.keys(process.env))
    manifest.map(line => line.split(' ')).forEach(pair => {
      const relativePath = path.relative(rootDir, pair[0]);
      //config.push({path: `/${relativePath}`, root: pair[1]});
    });
  }

  const server = createServer(config);
  return server.listen(port, () => {
    console.log(`prodserver running at http://localhost:${port}\nCtrl+C to stop`);
  });
}

function main(args) {
  // rootDir always joined with forward slash since it is used for keys in the
  // MANIFEST file
  const rootDir = path.posix.join(process.env['BAZEL_WORKSPACE'] || '.', args[0]);
  const port = getArg(args, '-p') || getArg(args, '--port', 8080);
  startServer(rootDir, port);
}

module.exports = {main, startServer};

if (require.main === module) {
  main(process.argv.slice(2));
}
