const fs = require('fs');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

function checkExists(name) {
  if (!fs.existsSync(runfiles.resolvePackageRelative(name))) {
    fail(`Output ${name} does not exist.`);
  }
}

// TODO: the right assertions are to load up the source-map library
// and assert that the sourcemap actually maps back to the sources

describe('outputgroups', () => {
  it('should produce a es2015 sourcemap', () => {
    checkExists('bundle.es2015.js');
    checkExists('bundle.es2015.js.map');
  });
  it('should produce a es5_min sourcemap', () => {
    checkExists('bundle.min.js');
    checkExists('bundle.min.js.map');
  });
  it('should produce a es5_min_debug sourcemap', () => {
    checkExists('bundle.min_debug.js');
    checkExists('bundle.min_debug.js.map');
  });
  it('should produce a cjs sourcemap', () => {
    checkExists('bundle.cjs.js');
    checkExists('bundle.cjs.js.map');
  });
  it('should produce a umd sourcemap', () => {
    checkExists('bundle.umd.js');
    checkExists('bundle.umd.js.map');
  });
  it('should produce a umd_min sourcemap', () => {
    checkExists('bundle.min.umd.js');
    checkExists('bundle.min.umd.js.map');
  });
  it('should produce a es5_umd_min sourcemap', () => {
    checkExists('bundle.min.es5umd.js');
    checkExists('bundle.min.es5umd.js.map');
  });
});
