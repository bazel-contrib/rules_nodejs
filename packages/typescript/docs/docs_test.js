const actual = require('fs').readFileSync(
    process.env['TEST_SRCDIR'] + '/npm_bazel_typescript/index.md', {encoding: 'utf-8'});
if (actual.indexOf('<unknown name>') >= 0) {
  throw new Error('Found <unknown name> in index.md');
}
