// We expected the bundle with deps to return the following
// string which indicates that test-b@0.0.2 was imported and
// bundled and test-a@0.0.4 was required at runtime since test-b
// had a require('test-a') and rollup should not have bundled
// test-a@0.0.1
const expectedDeps = 'test-b-0.0.2/test-a-0.0.4';

const expectedNoDeps = 'no-deps';

describe('bundling main entry point', () => {
  it('bundle_no_deps.es6.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_no_deps.es6.js')
    expect(bundle).toEqual(expectedNoDeps);
  });

  it('bundle_no_deps.js should work', async () => {
    const bundle =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_no_deps.js')
    expect(bundle).toEqual(expectedNoDeps);
  });

  it('bundle_no_deps.min.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_no_deps.min.js');
    expect(bundle).toEqual(expectedNoDeps);
  });

  it('bundle_no_deps.min_debug.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_no_deps.min_debug.js')
    expect(bundle).toEqual(expectedNoDeps);
  });

  it('bundle.es6.js should work', async () => {
    const bundle =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle.es6.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle.js should work', async () => {
    const bundle =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle.min.js should work', async () => {
    const bundle =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle.min.js');
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle.min_debug.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle.min_debug.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_legacy.es6.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_legacy.es6.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_legacy.js should work', async () => {
    const bundle =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_legacy.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_legacy.min.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_legacy.min.js');
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_legacy.min_debug.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_legacy.min_debug.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_hybrid.es6.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_hybrid.es6.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_hybrid.js should work', async () => {
    const bundle =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_hybrid.js')
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_hybrid.min.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_hybrid.min.js');
    expect(bundle).toEqual(expectedDeps);
  });

  it('bundle_hybrid.min_debug.js should work', async () => {
    const bundle = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps/bundle_hybrid.min_debug.js')
    expect(bundle).toEqual(expectedDeps);
  });
});
