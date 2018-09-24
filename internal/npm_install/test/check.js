const generator = require('../generate_build_file');
const fs = require('fs');
const path = require('path');
const unidiff = require('unidiff')

function check(actual, updateGolden = false) {
  // We must change the directory to the BUILD file path
  // so the generator is able to run
  process.chdir(path.dirname(__filename));

  // Run the BUILD file generator
  generator.main();

  // Strip comments from generated file for comparison to golden
  // to make comparison less brittle
  const actualContents = fs.readFileSync(actual, {encoding: 'utf-8'})
                             .replace(/\r\n/g, '\n')
                             .split('\n')
                             .filter(l => !l.trimLeft().startsWith('#'))
                             .join('\n')
                             .replace(/[\n]+/g, '\n');

  // Load the golden file for comparison
  const golden = path.posix.join('golden', actual + '.golden');
  const goldenContents = fs.readFileSync(golden, {encoding: 'utf-8'}).replace(/\r\n/g, '\n');

  // Check if actualContents matches golden file
  if (actualContents !== goldenContents) {
    if (updateGolden) {
      // Write to golden file
      fs.writeFileSync(golden, actualContents);
      console.error(`Replaced ${path.join(process.cwd(), golden)}`);
    } else {
      // Generated does not match golden
      const diff = unidiff.diffLines(goldenContents, actualContents);
      const prettyDiff = unidiff.formatLines(diff);
      throw new Error(`Actual output in ${actual} doesn't match golden file ${golden}.

Diff:
${prettyDiff}

Update the golden file:

      bazel run ${process.env['BAZEL_TARGET']}.accept`);
    }
  }
}

module.exports = {
  check,
  files: [
    'BUILD.bazel',
    '@gregmagolan/BUILD.bazel',
    '@gregmagolan/test-a/BUILD.bazel',
    '@gregmagolan/test-a/bin/BUILD.bazel',
    '@gregmagolan/test-b/BUILD.bazel',
    '@gregmagolan/test-b/bin/BUILD.bazel',
    'jasmine/BUILD.bazel',
    'jasmine/bin/BUILD.bazel',
    'unidiff/BUILD.bazel',
    'unidiff/bin/BUILD.bazel',
    'node_modules/@gregmagolan/BUILD.bazel',
    'node_modules/@gregmagolan/test-a/BUILD.bazel',
    'node_modules/@gregmagolan/test-b/BUILD.bazel',
    'node_modules/jasmine/BUILD.bazel',
    'node_modules/unidiff/BUILD.bazel',
  ],
};