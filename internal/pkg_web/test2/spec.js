const fs = require('fs');
const path = require('path');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('pkg_web paths', () => {
  it('should match the golden file', () => {
    const output = 'build_bazel_rules_nodejs/internal/pkg_web/test2/pkg/index.html';
    const golden = 'build_bazel_rules_nodejs/internal/pkg_web/test2/index_golden.html_';
    const actual = fs.readFileSync(runfiles.resolve(output), {encoding: 'utf-8'});
    const expected = fs.readFileSync(runfiles.resolve(golden), {encoding: 'utf-8'});
    // make the input hermetic by replacing the cache-buster timestamp
    expect(actual.replace(/\?v=\d+/g, '?v=123').trim()).toBe(expected.trim());
  });
});
