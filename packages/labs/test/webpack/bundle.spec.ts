/// <reference types="jasmine"/>

describe('webpack_bundle', () => {
  it('should work', () => {
    const bundle = 'build_bazel_rules_nodejs/packages/labs/test/webpack/bundle.js';
    let out = '';
    console.log = (s: string) => out = s;
    require(bundle);
    expect(out).toBe('hello, world');
  });
});
