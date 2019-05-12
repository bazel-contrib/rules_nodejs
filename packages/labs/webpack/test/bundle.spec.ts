/// <reference types="jasmine"/>

describe('webpack_bundle', () => {
  it('should work', () => {
    const bundle = 'npm_bazel_labs/webpack/test/bundle.js';
    let out = '';
    console.log = (s: string) => out = s;
    require(bundle);
    expect(out).toBe('hello, world');
  });
});
