check = require('../check.js');
const path = __dirname;

describe('bundling', () => {
  it('should work', () => {
    check(path, 'bundle.min.js', 'bundle-min_golden.js_');
  });
  it('should produce a sourcemap', () => {
    // TODO(alexeagle): the right assertion is to load up the source-map library
    // and assert that the sourcemap actually maps back to the sources
    check(path, 'bundle.min.js.map', 'bundle-min_golden.js.map');
  });
  it('should produce a debug bundle', () => {
    check(path, 'bundle.min_debug.js', 'bundle-min-debug_golden.js_');
  });
  it('should rewrite global imports', () => {
    check(path, 'bundle.umd.js', 'bundle-umd_golden.js_');
  });
});
