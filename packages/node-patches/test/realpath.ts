/**
 * @fileoverview Description of this file.
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import { withFixtures } from 'inline-fixtures';
import { patcher } from '../src/fs';

describe('testing realpath', () => {
  it('can resolve symlink in root', async () => {
    await withFixtures(
      {
        a: {},
        b: { file: 'contents' },
      },
      async fixturesDir => {
        // create symlink from a to b
        fs.symlinkSync(
          path.join(fixturesDir, 'b', 'file'),
          path.join(fixturesDir, 'a', 'link')
        );

        const patchedFs = Object.assign({}, fs);
        patchedFs.promises = Object.assign({}, fs.promises);

        patcher(patchedFs, path.join(fixturesDir));
        const linkPath = path.join(fs.realpathSync(fixturesDir), 'a', 'link');

        assert.deepStrictEqual(
          patchedFs.realpathSync(linkPath),
          path.join(fixturesDir, 'b', 'file'),
          'SYNC: should resolve the symlink the same because its within root'
        );

        assert.deepStrictEqual(
          await util.promisify(patchedFs.realpath)(linkPath),
          path.join(fixturesDir, 'b', 'file'),
          'CB: should resolve the symlink the same because its within root'
        );

        assert.deepStrictEqual(
          await patchedFs.promises.realpath(linkPath),
          path.join(fixturesDir, 'b', 'file'),
          'Promise: should resolve the symlink the same because its within root'
        );
      }
    );
  });

  it("doesn't resolve as symlink outside of root", async () => {
    await withFixtures(
      {
        a: {},
        b: { file: 'contents' },
      },
      async fixturesDir => {
        // create symlink from a to b
        fs.symlinkSync(
          path.join(fixturesDir, 'b', 'file'),
          path.join(fixturesDir, 'a', 'link')
        );

        const patchedFs = Object.assign({}, fs);
        patchedFs.promises = Object.assign({}, fs.promises);

        patcher(patchedFs, path.join(fixturesDir, 'a'));
        const linkPath = path.join(fs.realpathSync(fixturesDir), 'a', 'link');

        assert.deepStrictEqual(
          patchedFs.realpathSync(linkPath),
          path.join(fixturesDir, 'a', 'link'),
          'should pretend symlink is in the root'
        );

        assert.deepStrictEqual(
          await util.promisify(patchedFs.realpath)(linkPath),
          path.join(fixturesDir, 'a', 'link'),
          'should pretend symlink is in the root'
        );

        assert.deepStrictEqual(
          await patchedFs.promises.realpath(linkPath),
          path.join(fixturesDir, 'a', 'link'),
          'should pretend symlink is in the root'
        );
      }
    );
  });
});
