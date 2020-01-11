const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('rollup multiple entry points', () => {
  it('should produce a chunk for each entry point', () => {
    const chunks = runfiles.resolvePackageRelative('chunks');
    expect(fs.existsSync(chunks + '/one.js')).toBeTruthy();
    expect(fs.existsSync(chunks + '/two.js')).toBeTruthy();
  });
});
