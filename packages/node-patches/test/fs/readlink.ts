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

describe('testing readlink', () => {
  it('can resolve symlink in root', async () => {
    await withFixtures(
        {
          a: {},
          b: {file: 'contents'},
        },
        async fixturesDir => {
          fixturesDir = fs.realpathSync(fixturesDir);
          // create symlink from a to b
          fs.symlinkSync(path.join(fixturesDir, 'b', 'file'), path.join(fixturesDir, 'a', 'link'));

          const patchedFs = Object.assign({}, fs);
          patchedFs.promises = Object.assign({}, fs.promises);

          patcher(patchedFs, [path.join(fixturesDir)]);
          const linkPath = path.join(fixturesDir, 'a', 'link');

          assert.deepStrictEqual(
              patchedFs.readlinkSync(linkPath), path.join(fixturesDir, 'b', 'file'),
              'SYNC: should read the symlink because its within root');

          assert.deepStrictEqual(
              await util.promisify(patchedFs.readlink)(linkPath),
              path.join(fixturesDir, 'b', 'file'),
              'CB: should read the symlink because its within root');

          assert.deepStrictEqual(
              await patchedFs.promises.readlink(linkPath), path.join(fixturesDir, 'b', 'file'),
              'Promise: should read the symlink because its within root');
        });
  });

  it('doesn\'t resolve as symlink outside of root', async () => {
    await withFixtures(
        {
          a: {},
          b: {file: 'contents'},
        },
        async fixturesDir => {
          fixturesDir = fs.realpathSync(fixturesDir);
          // create symlink from a to b
          fs.symlinkSync(path.join(fixturesDir, 'b', 'file'), path.join(fixturesDir, 'a', 'link'));

          const patchedFs = Object.assign({}, fs);
          patchedFs.promises = Object.assign({}, fs.promises);

          patcher(patchedFs, [path.join(fixturesDir, 'a')]);
          const linkPath = path.join(fs.realpathSync(fixturesDir), 'a', 'link');

          assert.throws(() => {
            patchedFs.readlinkSync(linkPath);
          }, 'should throw because it\'s not a link');

          let thrown;
          try {
            await util.promisify(patchedFs.readlink)(linkPath);
          } catch (e) {
            thrown = e;
          } finally {
            if (!thrown) assert.fail('must throw einval error');
          }

          thrown = undefined;
          try {
            await patchedFs.promises.readlink(linkPath);
          } catch (e) {
            thrown = e;
          } finally {
            if (!thrown) assert.fail('must throw einval error');
          }
        });
  });
});
