const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('googmodule', () => {
  let output;
  beforeAll(() => {
    output = runfiles.resolvePackageRelative('a.js');
  });

  it('should have goog module syntax in devmode', () => {
    expect(fs.readFileSync(output, {
      encoding: 'utf-8'
    })).toContain(`goog.module('build_bazel_rules_nodejs.packages.concatjs.test.googmodule.a')`);
  });
  it('should have tsickle type annotations', () => {
    expect(fs.readFileSync(output, {encoding: 'utf-8'})).toContain(`@type {number}`);
  });
});