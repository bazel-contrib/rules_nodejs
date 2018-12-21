const fs = require('fs');
const path = require('path');

process.chdir(path.join(process.env['TEST_SRCDIR'], 'build_bazel_rules_nodejs'));
console.error(fs.readdirSync('.'));
describe('web_package', () => {
  it('should match the golden file', () => {
    const actual = fs.readFileSync('internal/web_package/test/pkg/index.html', {encoding: 'utf-8'});
    const expected =
        fs.readFileSync('internal/web_package/test/index_golden.html_', {encoding: 'utf-8'});
    // make the input hermetic by replacing the cache-buster timestamp
    expect(actual.replace(/\?v=\d+/, '?v=123')).toBe(expected);
  });
});
