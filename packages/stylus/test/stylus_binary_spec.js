const cssPath = require.resolve('build_bazel_rules_nodejs/packages/stylus/test/file.css');
const content = require('fs').readFileSync(cssPath, {encoding: 'utf-8'});

describe('stylus_binary rule', () => {
  it('should transform the css file', () => {
    expect(content).toContain('body #logo');
    expect(content).toContain('width:10px');
  });
  it('should compress the output', () => {
    // compress option should remove newlines
    expect(content).not.toMatch(/\r|\n/);
  });
  // see http://stylus-lang.com/docs/executable.html#resolving-relative-urls-inside-imports
  it('should resolve relative URLs', () => {
    // the ../ segments here are from bazel-out/[arch]/bin/packages/stylus/test back to the
    // workspace root
    // users will probably have a final packaging where the original png file is layed out
    // next to the css file, so this seems undesirable...
    expect(content).toContain('url("../../../../../../packages/stylus/test/subdir/baz.png")');
  });
});
