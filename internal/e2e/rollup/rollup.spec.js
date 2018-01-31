const fs = require('fs');

function read(relativePath) {
  // TODO(#32) Can shorten the path if https://github.com/bazelbuild/rules_nodejs/issues/32 is resolved
  const path = `build_bazel_rules_nodejs/internal/e2e/rollup/${relativePath}`;
  return fs.readFileSync(require.resolve(path), { encoding: 'utf-8' }).replace(/\r\n/g, '\n');
}
describe('bundling', () => {
  it('should work', () => {
    expect(read('bundle.min.js')).toEqual(read('bundle-min_golden.js'));
  });
  it('should produce a debug bundle', () => {
    expect(read('bundle.min_debug.js')).toEqual(read('bundle-min-debug_golden.js'));
  });
});
