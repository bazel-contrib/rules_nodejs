const {readFileSync} = require('fs');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const location =
    helper.resolve('build_bazel_rules_nodejs/packages/esbuild/test/external-flag/bundle.js');

describe('esbuild external-flag', () => {
  it('compiles with the external module \'fs\'', () => {
    const bundle = readFileSync(location, {encoding: 'utf8'});
    expect(bundle).toContain('console.log(fs)');
  });
})
