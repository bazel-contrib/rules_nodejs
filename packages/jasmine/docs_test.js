const actual = require('fs').readFileSync(
    process.env['TEST_SRCDIR'] + '/build_bazel_rules_nodejs/packages/jasmine/README.md',
    {encoding: 'utf-8'});
if (actual.indexOf('<unknown name>') >= 0) {
  throw new Error('Found <unknown name> in README.md');
}
