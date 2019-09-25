check = require('check');

describe('bundling', () => {
  it('should work', () => {
    check('bundle.min.js', 'bundle-min_golden.js_');
  });
  it('should produce a sourcemap', () => {
    // TODO(alexeagle): the right assertion is to load up the source-map library
    // and assert that the sourcemap actually maps back to the sources
    check('bundle.min.js.map', 'bundle-min_golden.js.map');
  });
  it('should produce a debug bundle', () => {
    check('bundle.min_debug.js', 'bundle-min-debug_golden.js_');
  });
  it('should rewrite global imports', () => {
    check('bundle.umd.js', 'bundle-umd_golden.js_');
  });
  it('should produce a CJS bundle', () => {
    check('bundle.cjs.js', 'bundle-cjs_golden.js_');
  });
  it('should produce an es5 UMD bundle', () => {
    check('bundle.es5umd.js', 'bundle-es5umd_golden.js_');
  });
  it('should produce an es5 minified UMD bundle', () => {
    check('bundle.min.es5umd.js', 'bundle-min-es5umd_golden.js_');
  });
});
