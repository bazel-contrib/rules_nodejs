const fs = require('fs');
const DIR = 'build_bazel_rules_nodejs/packages/terser/test/js_srcs';

describe('terser rule', () => {
  it('should accept InputArtifact (file in project)', () => {
    const file = require.resolve(DIR + '/case1.js');
    const expected = process.env['DEBUG'] ?
        'console.error("here is non-optimized JS");\n\nexport const a = 1;' :
        'console.error("here is non-optimized JS");export const a=1;';
    expect(fs.readFileSync(file, 'utf-8')).toBe(expected);
  });
  it('should accept a rule that produces JS files in DefaultInfo', () => {
    const file = require.resolve(DIR + '/case2.js');
    expect(fs.readFileSync(file, 'utf-8')).toBe('console.log("src2");');
  });
});
