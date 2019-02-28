check = require('../check.js');
const fs = require('fs');
const expected = 'lib1 fn,dep3 fn,lib2 fn,dep2 fn';
const path = __dirname;

describe('bundling additional entry point', () => {
  it('should work', () => {
    check(path, 'bundle.min.js', 'bundle-min_golden.js_');
  });

  // Disabled because native ESModules can't be loaded in current nodejs
  xit('bundle_chunks_es6 should work', () => {
    const additional_entry = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle_chunks_es6/additional_entry.js');
    console.error(additional_entry)
    const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle_chunks should work', () => {
    const additional_entry =
        require(
            'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle_chunks/additional_entry.js')
            .default const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle_chunks_min should work', () => {
    const additional_entry =
        require(
            'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle_chunks_min/additional_entry.js')
            .default const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle_chunks_min_debug should work', () => {
    const additional_entry =
        require(
            'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle_chunks_min_debug/additional_entry.js')
            .default const actual = (new additional_entry()).test();
    expect(actual).toEqual(expected);
  });

  it('should have a license header', () => {
    const content = fs.readFileSync(
        require.resolve(
            'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle_chunks_min_debug/additional_entry.js'),
        {encoding: 'utf-8'});
    expect(content).toContain('dummy license banner');
  });
});