const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('rollup multiple entry points', () => {
  it('should produce a chunk for each expanded entry point', () => {
    const chunks = runfiles.resolvePackageRelative('dir');
    expect(fs.existsSync(chunks + '/entry1.js')).toBeTruthy();
    expect(fs.existsSync(chunks + '/entry2.js')).toBeTruthy();
  });
});
