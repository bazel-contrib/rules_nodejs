const fs = require('fs');
const path = require('path');
const unidiff = require('unidiff')

function check(file, updateGolden = false) {
  // Strip comments from generated file for comparison to golden
  // to make comparison less brittle
  const actual = require.resolve(path.posix.join('fine_grained_goldens', file));
  const actualContents =
      fs.readFileSync(actual, {encoding: 'utf-8'})
          .replace(/\r\n/g, '\n')
          .split('\n')
          // Remove all comments for the comparison
          .filter(l => !l.trimLeft().startsWith('#'))
          // Remove .cmd files for the comparison since they only exist on Windows
          .filter(l => !l.endsWith('.cmd",'))
          .join('\n')
          .replace(/[\n]+/g, '\n');

  // Load the golden file for comparison
  const golden = require.resolve('./golden/' + file + '.golden');

  if (updateGolden) {
    // Write to golden file
    // TODO(kyliau): Consider calling mkdirp() here, otherwise write operation
    // would fail if directory does not already exist.
    fs.writeFileSync(golden, actualContents);
    console.error(`Replaced ${path.join(golden)}`);
  } else {
    const goldenContents = fs.readFileSync(golden, {encoding: 'utf-8'}).replace(/\r\n/g, '\n');
    // Check if actualContents matches golden file
    if (actualContents !== goldenContents) {
      // Generated does not match golden
      const diff = unidiff.diffLines(goldenContents, actualContents);
      const prettyDiff = unidiff.formatLines(diff);
      throw new Error(`Actual output in ${file} doesn't match golden file ${golden}.

Diff:
${prettyDiff}

Update the golden file:

      bazel run ${process.env['TEST_TARGET']}.update`);
    }
  }
}

module.exports = {
  check,
  files: [
    'BUILD.bazel',
    'manual_build_file_contents',
    'WORKSPACE',
    '@angular/core/BUILD.bazel',
    '@gregmagolan/BUILD.bazel',
    '@gregmagolan/test-a/bin/BUILD.bazel',
    '@gregmagolan/test-a/BUILD.bazel',
    '@gregmagolan/test-a/index.bzl',
    '@gregmagolan/test-b/BUILD.bazel',
    'ajv/BUILD.bazel',
    'jasmine/bin/BUILD.bazel',
    'jasmine/BUILD.bazel',
    'jasmine/index.bzl',
    'rxjs/BUILD.bazel',
    'unidiff/BUILD.bazel',
    'zone.js/BUILD.bazel',
  ],
};
