/**
 * @fileoverview Description of this file.
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { withFixtures } from 'inline-fixtures';
import { patcher } from '../src/fs';

describe('testing', () => {
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

        patcher(patchedFs, fixturesDir);
        const linkPath = path.join(fs.realpathSync(fixturesDir), 'a', 'link');

        assert.strictEqual(
          patchedFs.realpathSync(linkPath),
          fs.realpathSync(linkPath),
          'should resolve the symlink the same because its within root'
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

        assert.strictEqual(
          patchedFs.realpathSync(linkPath),
          path.join(fixturesDir, 'a', 'link'),
          'should pretend symlink is in the root'
        );
      }
    );
  });
});
