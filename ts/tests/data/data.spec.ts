import {promises as fs} from 'fs';

const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']!);

const FOO_PATH =
    runfiles.resolve('build_bazel_rules_nodejs/ts/tests/data/foo.txt');

describe('data', () => {
  it('makes files available at runtime', async () => {
    const foo = await fs.readFile(FOO_PATH, {encoding: 'utf8'});
    expect(foo).toBe('Foo\n');
  });
});
