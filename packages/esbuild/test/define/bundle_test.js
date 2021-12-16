const {readFileSync} = require('fs');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const location = helper.resolve('build_bazel_rules_nodejs/packages/esbuild/test/define/bundle.js');
const stampedLocation = helper.resolve('build_bazel_rules_nodejs/packages/esbuild/test/define/stamped_bundle.js');

describe('esbuild define', () => {
  it('defines variables', () => {
    const bundle = readFileSync(location, {encoding: 'utf8'});
    expect(bundle).toContain(`nodeEnv = "defined_in_bundle"`);
    expect(bundle).toContain(`env = "some_value"`);
    expect(bundle).toContain(`someStringFlag = "default_\`'\\"flag\\"'\`_value"`);
    expect(bundle).toContain(`someBoolFlag = true`);
    expect(bundle).toContain(`cwd: () => "rules_nodejs"`);
    expect(bundle).toContain(`version = BUILD_SCM_VERSION`);
  });

  it('defines stamp variables', () => {
    const bundle = readFileSync(stampedLocation, {encoding: 'utf8'});
    expect(bundle).toContain(`nodeEnv = "defined_on_rule"`);
    expect(bundle).toContain(`env = "some_value"`);
    expect(bundle).toContain(`someStringFlag = "default_\`'\\"flag\\"'\`_value"`);
    expect(bundle).toContain(`someBoolFlag = true`);
    expect(bundle).toContain(`version = "v1.2.3"`);
  });
});
