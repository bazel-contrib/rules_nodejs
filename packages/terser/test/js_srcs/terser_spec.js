const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('terser rule', () => {
  it('should accept InputArtifact (file in project)', () => {
    const file = runfiles.resolvePackageRelative('case1.js');
    const debugBuild = /\/bazel-out\/[^/\s]*-dbg\//.test(file);
    const expected = debugBuild ?
        'console.error("here is non-optimized JS");\n\nexport const a = 1;' :
        'console.error("here is non-optimized JS");export const a=1;';
    expect(fs.readFileSync(file, 'utf-8')).toBe(expected);
  });
  it('should accept a rule that produces JS files in DefaultInfo', () => {
    const file = runfiles.resolvePackageRelative('case2.js');
    expect(fs.readFileSync(file, 'utf-8')).toBe('console.log("src2");');
  });
});
