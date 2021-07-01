const {join} = require('path')
const {runfiles} = require('@bazel/runfiles');

describe('runfile resolution', () => {

  it('should properly resolve the "test_fixture.md" file', () => {
    const testFixturePath = runfiles.resolve('build_bazel_rules_nodejs/packages/runfiles/test/test_fixture.md');
    const expectedPath = join(__dirname, 'test_fixture.md');

    expect(normalizePath(testFixturePath)).toEqual(normalizePath(expectedPath),
            'Expected the test fixture to be resolved next to the spec source file.');
  });
});

/**
 * Normalizes the delimiters within the specified path. This is useful for test assertions
 * where paths might be computed using different path delimiters.
 */
function normalizePath(value) {
  return value.replace(/\\/g, '/');
}
