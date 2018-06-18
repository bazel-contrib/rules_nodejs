const fs = require('fs');
const path = require('path');
const unidiff = require('unidiff')

function read(relativePath) {
  // TODO(#32) Can shorten the path if
  // https://github.com/bazelbuild/rules_nodejs/issues/32 is resolved
  const path = `build_bazel_rules_nodejs/internal/e2e/rollup/${relativePath}`;
  return fs.readFileSync(require.resolve(path), {encoding: 'utf-8'})
      .replace(/\r\n/g, '\n')
      .replace(/\\\\/g, '/')
      // In the sourcemap, CRLF is turned into a string encoding
      .replace(/\\r\\n/g, '\\n');
}

// These keys are arbitrary and local to this test.
const update_var = 'UPDATE_GOLDEN'
const update_val = '1'

if (process.env[update_var] && process.env['TEST_SRCDIR']) {
  throw new Error(`Cannot use ${update_var} when run as a test. Use bazel run instead.`);
}

function check(actual, expected) {
  const actualContents = read(actual);
  const expectedContents = read(expected);
  if (actualContents !== expectedContents) {
    if (process.env[update_var] === update_val) {
      writePath = path.join(__dirname, expected);
      fs.writeFileSync(writePath, actualContents);
      console.error('Replaced ', writePath);
    } else {
      const diff = unidiff.diffLines(actualContents, expectedContents);
      const prettyDiff = unidiff.formatLines(diff);
      fail(`Actual output in ${actual} doesn't match golden file ${expected}.

Diff:
${prettyDiff}

Update the golden file:

      bazel run --define ${update_var}=${update_val} ${process.env['BAZEL_TARGET']}`);
    }
  }
}

describe('bundling', () => {
  it('should work', () => {
    check('bundle_override.min.js', 'golden_override/bundle-min_golden.js_');
  });
  it('should produce a sourcemap', () => {
    // TODO(alexeagle): the right assertion is to load up the source-map library
    // and assert that the sourcemap actually maps back to the sources
    check('bundle_override.min.js.map', 'golden_override/bundle-min_golden.js.map');
  });
  it('should produce a debug bundle', () => {
    check('bundle_override.min_debug.js', 'golden_override/bundle-min-debug_golden.js_');
  });
  it('should rewrite global imports', () => {
    check('bundle_override.umd.js', 'golden_override/bundle-umd_golden.js_');
  });
});
