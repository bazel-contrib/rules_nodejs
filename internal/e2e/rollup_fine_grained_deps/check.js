const fs = require('fs');
const path = require('path');
const unidiff = require('unidiff')

function check(file, updateGolden = false) {
  const actual = require.resolve(
      path.posix.join('build_bazel_rules_nodejs/internal/e2e/rollup_fine_grained_deps', file));
  const actualContents = fs.readFileSync(actual, {encoding: 'utf-8'}).replace(/\r\n/g, '\n');
  const golden = path.posix.join(path.dirname(__filename), 'golden', file + '.golden');
  const goldenContents = fs.readFileSync(golden, {encoding: 'utf-8'}).replace(/\r\n/g, '\n');

  if (actualContents !== goldenContents) {
    if (updateGolden) {
      // Write to golden file
      fs.writeFileSync(golden, actualContents);
      console.error(`Replaced ${path.join(process.cwd(), golden)}`);
    } else {
      // Generated does not match golden
      const diff = unidiff.diffLines(goldenContents, actualContents);
      const prettyDiff = unidiff.formatLines(diff);
      throw new Error(`Actual output in ${file} doesn't match golden file ${golden}.

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
    'bundle.es2015.js',
    'bundle.js',
    'bundle.min.js',
    'bundle.min_debug.js',
    'bundle_hybrid.es2015.js',
    'bundle_hybrid.js',
    'bundle_hybrid.min.js',
    'bundle_hybrid.min_debug.js',
    'bundle_legacy.es2015.js',
    'bundle_legacy.js',
    'bundle_legacy.min.js',
    'bundle_legacy.min_debug.js',
    'bundle_no_deps.es2015.js',
    'bundle_no_deps.js',
    'bundle_no_deps.min.js',
    'bundle_no_deps.min_debug.js',
  ],
};
