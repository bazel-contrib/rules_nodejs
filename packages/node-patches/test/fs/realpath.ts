/**
 * @license
 * Copyright 2019 The Bazel Authors. All rights reserved.
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
import * as assert from 'assert';
// windows cant find the right types
const fs = require('fs');
import {withFixtures} from 'inline-fixtures';
import * as path from 'path';
import * as util from 'util';

import {patcher} from '../../src/fs';

describe('testing realpath', () => {
  it('can resolve symlink in root', async () => {
    await withFixtures(
        {
          a: {},
          b: {file: 'contents'},
        },
        async fixturesDir => {
          // on mac, inside of bazel, the fixtures dir returned here is not realpath-ed.
          fixturesDir = fs.realpathSync(fixturesDir);

          // create symlink from a to b
          fs.symlinkSync(path.join(fixturesDir, 'b', 'file'), path.join(fixturesDir, 'a', 'link'));

          const patchedFs = Object.assign({}, fs);
          patchedFs.promises = Object.assign({}, fs.promises);

          patcher(patchedFs, [path.join(fixturesDir)]);
          const linkPath = path.join(fs.realpathSync(fixturesDir), 'a', 'link');

          assert.deepStrictEqual(
              patchedFs.realpathSync(linkPath), path.join(fixturesDir, 'b', 'file'),
              'SYNC: should resolve the symlink the same because its within root');

          assert.deepStrictEqual(
              patchedFs.realpathSync.native(linkPath), path.join(fixturesDir, 'b', 'file'),
              'SYNC.native: should resolve the symlink the same because its within root');

          assert.deepStrictEqual(
              await util.promisify(patchedFs.realpath)(linkPath),
              path.join(fixturesDir, 'b', 'file'),
              'CB: should resolve the symlink the same because its within root');

          assert.deepStrictEqual(
              await util.promisify(patchedFs.realpath.native)(linkPath),
              path.join(fixturesDir, 'b', 'file'),
              'CB: should resolve the symlink the same because its within root');

          assert.deepStrictEqual(
              await patchedFs.promises.realpath(linkPath), path.join(fixturesDir, 'b', 'file'),
              'Promise: should resolve the symlink the same because its within root');
        });
  });

  it('doesn\'t resolve as symlink outside of root', async () => {
    await withFixtures(
        {
          a: {},
          b: {file: 'contents'},
        },
        async fixturesDir => {
          // ensure realpath.
          fixturesDir = fs.realpathSync(fixturesDir);

          // create symlink from a to b
          fs.symlinkSync(path.join(fixturesDir, 'b', 'file'), path.join(fixturesDir, 'a', 'link'));

          const patchedFs = Object.assign({}, fs);
          patchedFs.promises = Object.assign({}, fs.promises);

          patcher(patchedFs, [path.join(fixturesDir, 'a')]);
          const linkPath = path.join(fs.realpathSync(fixturesDir), 'a', 'link');

          assert.deepStrictEqual(
              patchedFs.realpathSync(linkPath), path.join(fixturesDir, 'a', 'link'),
              'should pretend symlink is in the root');

          assert.deepStrictEqual(
              await util.promisify(patchedFs.realpath)(linkPath),
              path.join(fixturesDir, 'a', 'link'), 'should pretend symlink is in the root');

          assert.deepStrictEqual(
              await patchedFs.promises.realpath(linkPath), path.join(fixturesDir, 'a', 'link'),
              'should pretend symlink is in the root');
        });
  });
});
