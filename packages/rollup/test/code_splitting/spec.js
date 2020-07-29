const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('rollup code splitting', () => {
  it('should produce a chunk for lazy loaded code', () => {
    const chunks = runfiles.resolvePackageRelative('bundle');

    expect(fs.existsSync(chunks + '/bundle.js')).toBeTruthy();
    expect(fs.existsSync(chunks + '/strings.js')).toBeTruthy();
  });
});
