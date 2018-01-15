const fs = require('fs');

describe('bundling', () => {
  it('should work', () => {
    // TODO(#32) Can shorten the path if https://github.com/bazelbuild/rules_nodejs/issues/32 is resolved
    const bundle = 'build_bazel_rules_nodejs/internal/e2e/rollup/bundle.min.js';
    const actual = fs.readFileSync(require.resolve(bundle), { encoding: 'utf-8' });
    const expected = '(function(){"use strict";var name="Alice";console.log("Hello, "+name)})();';
    expect(actual).toEqual(expected);
  });
});