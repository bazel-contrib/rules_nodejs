const fs = require('fs');
const DIR = 'build_bazel_rules_nodejs/packages/terser/test';

describe('terser rule', () => {
  it('should accept InputArtifact (file in project)', () => {
    const file = require.resolve(DIR + '/case1.js');
    expect(fs.readFileSync(file, 'utf-8'))
        .toBe('console.error("here is non-optimized JS");\n//# sourceMappingURL=case1.js.map');
  });
  it('should accept a rule that produces a JS file in DefaultInfo', () => {
    const file = require.resolve(DIR + '/case2.js');
    expect(fs.readFileSync(file, 'utf-8'))
        .toBe('console.log("src2");\n//# sourceMappingURL=case2.js.map');
  });
});
