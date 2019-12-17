const fs = require('fs');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

describe('webpack splitting when output_dir not set', () => {
  it('should produce only one chunk for lazy loaded code', () => {
    const chunks = runfiles.resolvePackageRelative('.');

    expect(fs.existsSync(chunks + '/bundle.js')).toBeTruthy();
    expect(fs.existsSync(chunks + '/1.chunk.js')).toBeFalsy();
  });
});
