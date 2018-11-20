check = require('../check.js');
const expected = 'lib1 fn,dep3 fn,lib2 fn,dep2 fn';
const path = __dirname;

describe('bundling additional entry point', () => {
  it('should work', () => {
    check(path, 'bundle.min.js', 'bundle-min_golden.js_');
  });

  it('bundle.cs.es6 should work', () => {
    const additional_entry = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.es6/additional_entry.js')
    const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs should work', () => {
    const additional_entry = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs/additional_entry.js')
    const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs.min should work', () => {
    const additional_entry = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.min/additional_entry.js')
    const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs.min_debug should work', () => {
    const additional_entry = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.min_debug/additional_entry.js')
    const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });
});