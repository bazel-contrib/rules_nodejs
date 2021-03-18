const {readFileSync, exists} = require('fs');
const path = require('path');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const locationBase = 'build_bazel_rules_nodejs/packages/esbuild/test/sourcemap/';

// Location for :bundle_default
const bundleDefaultLocation = helper.resolve(path.join(locationBase, 'bundle_default.js'));
const bundleDefaultSourcemapLocation =
    helper.resolve(path.join(locationBase, 'bundle_default.js.map'));

// Location for :bundle_inline
const bundleInlineLocation = helper.resolve(path.join(locationBase, 'bundle_inline.js'));

// Location for :bundle_external
const bundleExternalLocation = helper.resolve(path.join(locationBase, 'bundle_external.js'));
const bundleExternalSourcemapLocation =
    helper.resolve(path.join(locationBase, 'bundle_external.js.map'));

// Location for :bundle_both
const bundleBothLocation = helper.resolve(path.join(locationBase, 'bundle_both.js'));
const bundleBothSourcemapLocation = helper.resolve(path.join(locationBase, 'bundle_both.js.map'));

describe('esbuild sourcemap', () => {
  it('creates an external sourcemap by default', () => {
    const sourcemap = readFileSync(bundleDefaultSourcemapLocation, {encoding: 'utf8'});
    expect(sourcemap).toContain(
        '"sources": ["../../../../../../../packages/esbuild/test/sourcemap/main.ts"]');
  });

  it('does not inline the sourcemap by default', () => {
    const bundle = readFileSync(bundleDefaultLocation, {encoding: 'utf8'});
    expect(bundle).toContain('//# sourceMappingURL=bundle_default.js.map');
  });

  it('inlines the sourcemap when set to \'inline\'', () => {
    const bundle = readFileSync(bundleInlineLocation, {encoding: 'utf8'});
    expect(bundle).toContain('//# sourceMappingURL=data:application/json;base64');
  });

  it('has no sourcemap comment when set to \'external\'', () => {
    const bundle = readFileSync(bundleExternalLocation, {encoding: 'utf8'});
    expect(bundle).not.toContain('//# sourceMappingURL=');
  });

  it('creates an external sourcemap when set to \'external\'', () => {
    const sourcemap = readFileSync(bundleExternalSourcemapLocation, {encoding: 'utf8'});
    expect(sourcemap).toContain(
        '"sources": ["../../../../../../../packages/esbuild/test/sourcemap/main.ts"]');
  });

  it('inlines the sourcemap when set to \'both\'', () => {
    const bundle = readFileSync(bundleInlineLocation, {encoding: 'utf8'});
    expect(bundle).toContain('//# sourceMappingURL=data:application/json;base64');
  });

  it('creates an external sourcemap when set to \'both\'', () => {
    const sourcemap = readFileSync(bundleDefaultSourcemapLocation, {encoding: 'utf8'});
    expect(sourcemap).toContain(
        '"sources": ["../../../../../../../packages/esbuild/test/sourcemap/main.ts"]');
  });
})
