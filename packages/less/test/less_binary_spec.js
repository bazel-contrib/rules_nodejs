const cssPath = require.resolve('build_bazel_rules_nodejs/packages/less/test/file.css');
const content = require('fs').readFileSync(cssPath, {encoding: 'utf-8'});

describe('less_binary rule', () => {
  it('should transform the css file', () => {
    expect(content).toContain('body #logo');
    expect(content).toContain('width: 10px');
    expect(content).toContain('url("baz.png")');
  });
});
