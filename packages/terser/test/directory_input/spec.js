const fs = require('fs');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

describe('terser on a directory', () => {
  it('should produce an output for each input', () => {
    const out = runfiles.resolvePackageRelative('out.min');
    expect(fs.existsSync(out + '/input1.js')).toBeTruthy();
    expect(fs.existsSync(out + '/input2.js')).toBeTruthy();
  });
});
