const {readFileSync} = require('fs');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const location = helper.resolve('build_bazel_rules_nodejs/packages/esbuild/test/define/bundle.js');

describe('esbuild define', () => {
  it('defines variables', () => {
    const bundle = readFileSync(location, {encoding: 'utf8'});
    expect(bundle).toContain(`nodeEnv = "defined_in_bundle"`);
    expect(bundle).toContain(`cwd: () => "rules_nodejs"`);
  });
})
