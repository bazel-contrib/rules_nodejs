const expected = 'lib1 fn,dep3 fn,lib2 fn,dep2 fn';

describe('bundling additional entry point', () => {
  it('bundle.cs.es6 should work', () => {
    const main2 = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.es6/main2.js')
    const actual = (new main2()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs should work', () => {
    const main2 =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs/main2.js')
    const actual = (new main2()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs.min should work', () => {
    const main2 = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.min/main2.js')
    const actual = (new main2()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs.min_debug should work', () => {
    const main2 = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.min_debug/main2.js')
    const actual = (new main2()).test();
    expect(actual).toEqual(expected);
  });
});