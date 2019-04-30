const fs = require('fs');
const path = require('path');

process.chdir(path.join(process.env['TEST_SRCDIR'], 'build_bazel_rules_nodejs'));
console.error(fs.readdirSync('.'));
describe('web_package paths', () => {
  it('should match the golden file', () => {
    const output = 'build_bazel_rules_nodejs/internal/web_package/test2/pkg/index.html';
    const golden = 'build_bazel_rules_nodejs/internal/web_package/test2/index_golden.html_';
    const actual = fs.readFileSync(require.resolve(output), {encoding: 'utf-8'});
    const expected = fs.readFileSync(require.resolve(golden), {encoding: 'utf-8'});
    // make the input hermetic by replacing the cache-buster timestamp
    expect(actual.replace(/\?v=\d+/g, '?v=123')).toBe(expected);
  });
});
