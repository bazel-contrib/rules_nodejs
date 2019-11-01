import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import { withFixtures } from 'inline-fixtures';
import { patcher } from '../src/fs';

describe('testing readdir', () => {
  it('can readdir dirent in root', async () => {
    await withFixtures(
      {
        a: { apples: 'contents' },
        b: { file: 'contents' },
      },
      async fixturesDir => {
        // create symlink from a to b
        fs.symlinkSync(
          path.join(fixturesDir, 'b', 'file'),
          path.join(fixturesDir, 'a', 'link')
        );
        const deepStrictEqual = assert.deepStrictEqual;

        const patchedFs = Object.assign({}, fs);
        patchedFs.promises = Object.assign({}, fs.promises);
        patcher(patchedFs, fixturesDir);

        let dirents = patchedFs.readdirSync(path.join(fixturesDir, 'a'), {
          withFileTypes: true,
        });
        deepStrictEqual(dirents[0].name, 'apples');
        deepStrictEqual(dirents[1].name, 'link');
        assert.ok(dirents[0].isFile());
        assert.ok(dirents[1].isSymbolicLink());

        dirents = await util.promisify(patchedFs.readdir)(
          path.join(fixturesDir, 'a'),
          { withFileTypes: true }
        );
        deepStrictEqual(dirents[0].name, 'apples');
        deepStrictEqual(dirents[1].name, 'link');
        assert.ok(dirents[0].isFile());
        assert.ok(dirents[1].isSymbolicLink());

        dirents = await patchedFs.promises.readdir(
          path.join(fixturesDir, 'a'),
          { withFileTypes: true }
        );
        deepStrictEqual(dirents[0].name, 'apples');
        deepStrictEqual(dirents[1].name, 'link');
        assert.ok(dirents[0].isFile());
        assert.ok(dirents[1].isSymbolicLink());
      }
    );
  });
  it('can readdir link dirents as files out of root', async () => {
    await withFixtures(
      {
        a: { apples: 'contents' },
        b: { file: 'contents' },
      },
      async fixturesDir => {
        // create symlink from a to b
        fs.symlinkSync(
          path.join(fixturesDir, 'b', 'file'),
          path.join(fixturesDir, 'a', 'link')
        );
        const deepStrictEqual = assert.deepStrictEqual;

        const patchedFs = Object.assign({}, fs);
        patchedFs.promises = Object.assign({}, fs.promises);
        patcher(patchedFs, path.join(fixturesDir, 'a'));

        let dirents = patchedFs.readdirSync(path.join(fixturesDir, 'a'), {
          withFileTypes: true,
        });
        deepStrictEqual(dirents[0].name, 'apples');
        deepStrictEqual(dirents[1].name, 'link');
        assert.ok(dirents[0].isFile());
        assert.ok(!dirents[1].isSymbolicLink());
        assert.ok(dirents[1].isFile());

        dirents = await util.promisify(patchedFs.readdir)(
          path.join(fixturesDir, 'a'),
          { withFileTypes: true }
        );
        deepStrictEqual(dirents[0].name, 'apples');
        deepStrictEqual(dirents[1].name, 'link');
        assert.ok(dirents[0].isFile());
        assert.ok(!dirents[1].isSymbolicLink());
        assert.ok(dirents[1].isFile());

        dirents = await patchedFs.promises.readdir(
          path.join(fixturesDir, 'a'),
          { withFileTypes: true }
        );
        deepStrictEqual(dirents[0].name, 'apples');
        deepStrictEqual(dirents[1].name, 'link');
        assert.ok(dirents[0].isFile());
        assert.ok(!dirents[1].isSymbolicLink(), 'promise: not symlink');
        assert.ok(dirents[1].isFile());
      }
    );
  });
});
