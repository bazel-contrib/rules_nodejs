const fs = require('fs');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

describe('webpack multiple entry points', () => {
  it('should produce a chunk for each entry point', () => {
    const chunks = runfiles.resolvePackageRelative('chunks');
    expect(fs.existsSync(chunks + '/one.js')).toBeTruthy();
    expect(fs.existsSync(chunks + '/two.js')).toBeTruthy();
  });
});
