import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import { withFixtures } from 'inline-fixtures';
import { patcher } from '../src/fs';

describe('testing lstat', () => {
  it('can lstat symlink in root', async () => {
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

        const linkPath = path.join(fixturesDir, 'a', 'link');
        assert.ok(
          patchedFs.lstatSync(linkPath).isSymbolicLink(),
          'lstatSync should find symbolic link if link is the root'
        );

        assert.ok(
          (await util.promisify(patchedFs.lstat)(linkPath)).isSymbolicLink(),
          'lstat should find symbolic link if link is the root'
        );

        assert.ok(
          (await patchedFs.promises.lstat(linkPath)).isSymbolicLink(),
          'promises.lstat should find symbolic link if link is the root'
        );
      }
    );
  });

  it('lstat of symlink out of root is file.', async () => {
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

        const linkPath = path.join(fixturesDir, 'a', 'link');
        assert.ok(
          patchedFs.lstatSync(linkPath).isFile(),
          'lstatSync should find symbolic link if link is the root'
        );

        assert.ok(
          (await util.promisify(patchedFs.lstat)(linkPath)).isFile(),
          'lstat should find symbolic link if link is the root'
        );

        assert.ok(
          (await patchedFs.promises.lstat(linkPath)).isFile(),
          'promises.lstat should find symbolic link if link is the root'
        );
      }
    );
  });
});
