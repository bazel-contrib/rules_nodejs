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
import {deepStrictEqual, ok} from 'assert';
// windows cant find the right types
const fs = require('fs');
import {withFixtures} from 'inline-fixtures';
import * as path from 'path';
import * as util from 'util';

import {patcher} from '../../src/fs';

describe('testing readdir', () => {
  it('can readdir dirent in root', async () => {
    await withFixtures(
        {
          a: {apples: 'contents'},
          b: {file: 'contents'},
        },
        async fixturesDir => {
          fixturesDir = fs.realpathSync(fixturesDir);
          // create symlink from a to b
          fs.symlinkSync(path.join(fixturesDir, 'b', 'file'), path.join(fixturesDir, 'a', 'link'));

          const patchedFs = Object.assign({}, fs);
          patchedFs.promises = Object.assign({}, fs.promises);
          patcher(patchedFs, [fixturesDir]);

          let dirents = patchedFs.readdirSync(path.join(fixturesDir, 'a'), {
            withFileTypes: true,
          });
          deepStrictEqual(dirents[0].name, 'apples');
          deepStrictEqual(dirents[1].name, 'link');
          ok(dirents[0].isFile());
          ok(dirents[1].isSymbolicLink());

          dirents = await util.promisify(patchedFs.readdir)(
              path.join(fixturesDir, 'a'), {withFileTypes: true});
          deepStrictEqual(dirents[0].name, 'apples');
          deepStrictEqual(dirents[1].name, 'link');
          ok(dirents[0].isFile());
          ok(dirents[1].isSymbolicLink());

          dirents =
              await patchedFs.promises.readdir(path.join(fixturesDir, 'a'), {withFileTypes: true});
          deepStrictEqual(dirents[0].name, 'apples');
          deepStrictEqual(dirents[1].name, 'link');
          ok(dirents[0].isFile());
          ok(dirents[1].isSymbolicLink());
        });
  });
  it('can readdir link dirents as files out of root', async () => {
    await withFixtures(
        {
          a: {apples: 'contents'},
          b: {file: 'contents'},
        },
        async fixturesDir => {
          fixturesDir = fs.realpathSync(fixturesDir);
          // create symlink from a to b
          fs.symlinkSync(path.join(fixturesDir, 'b', 'file'), path.join(fixturesDir, 'a', 'link'));

          const patchedFs = Object.assign({}, fs);
          patchedFs.promises = Object.assign({}, fs.promises);
          patcher(patchedFs, [path.join(fixturesDir, 'a')]);

          let dirents = patchedFs.readdirSync(path.join(fixturesDir, 'a'), {
            withFileTypes: true,
          });
          deepStrictEqual(dirents[0].name, 'apples');
          deepStrictEqual(dirents[1].name, 'link');
          ok(dirents[0].isFile());
          ok(!dirents[1].isSymbolicLink());
          ok(dirents[1].isFile());

          dirents = await util.promisify(patchedFs.readdir)(
              path.join(fixturesDir, 'a'), {withFileTypes: true});
          deepStrictEqual(dirents[0].name, 'apples');
          deepStrictEqual(dirents[1].name, 'link');
          ok(dirents[0].isFile());
          ok(!dirents[1].isSymbolicLink());
          ok(dirents[1].isFile());

          dirents =
              await patchedFs.promises.readdir(path.join(fixturesDir, 'a'), {withFileTypes: true});
          deepStrictEqual(dirents[0].name, 'apples');
          deepStrictEqual(dirents[1].name, 'link');
          ok(dirents[0].isFile());
          ok(!dirents[1].isSymbolicLink(), 'promise: not symlink');
          ok(dirents[1].isFile());
        });
  });
});
