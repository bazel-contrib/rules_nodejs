const fs = require('fs');

describe('googmodule', () => {
  let output;
  beforeAll(() => {
    output = require.resolve(
        'build_bazel_rules_typescript/examples/googmodule/a.js');
  });

  it('should have goog module syntax in devmode', () => {
    expect(fs.readFileSync(output, {encoding: 'utf-8'}))
        .toContain(
            `goog.module('build_bazel_rules_typescript.examples.googmodule.a')`);
  });
  it('should have tsickle type annotations', () => {
    expect(fs.readFileSync(output, {
      encoding: 'utf-8'
    })).toContain(`@type {number}`);
  });
});