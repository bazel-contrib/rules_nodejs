const {readFileSync} = require('fs');
const path = require('path');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const locationBase = 'build_bazel_rules_nodejs/packages/esbuild/test/output/';

// Location for :bundle_output
const bundleOutputLocation = helper.resolve(path.join(locationBase, 'different_output.js'));
const bundleOutputSourcemapLocation =
    helper.resolve(path.join(locationBase, 'different_output.js.map'));

describe('esbuild sourcemap', () => {
  it('writes the bundle with name specified by \'output\'', () => {
    const bundle = readFileSync(bundleOutputLocation, {encoding: 'utf8'});
    expect(bundle).toContain('foo = {');
    // Sourcemaps should point to the right file
    expect(bundle).toContain('//# sourceMappingURL=different_output.js.map');
  });

  it('writes the sourcemap with name specified by \'output\'', () => {
    const sourcemap = readFileSync(bundleOutputSourcemapLocation, {encoding: 'utf8'});
    expect(sourcemap).toContain('"sources":');
    expect(sourcemap).toContain('"mappings":');
  });
})
