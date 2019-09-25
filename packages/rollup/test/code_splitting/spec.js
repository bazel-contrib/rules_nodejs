const fs = require('fs');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

describe('rollup code splitting', () => {
  it('should produce a chunk for lazy loaded code', () => {
    const chunks = runfiles.resolvePackageRelative('bundle');

    expect(fs.existsSync(chunks + '/bundle.js')).toBeTruthy();
    expect(fs.existsSync(chunks + '/chunk.js')).toBeTruthy();
  });
});
