const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('googmodule', () => {
  let devmodeOutput;
  let prodmodeOutput;
  beforeAll(() => {
    devmodeOutput = runfiles.resolvePackageRelative('a.js');
    prodmodeOutput = runfiles.resolvePackageRelative('a.mjs');
  });

  it('should have amd module syntax in devmode', () => {
    expect(fs.readFileSync(devmodeOutput, {encoding: 'utf-8'}))
        .toContain(
            `define("build_bazel_rules_nodejs/packages/concatjs/test/target_module_attributes/a", ["require", "exports"], function (require, exports) {`);
  });

  it('should have es5 in devmode', () => {
    const devoutput = fs.readFileSync(devmodeOutput, {encoding: 'utf-8'});

    expect(devoutput).toContain(`a = function () { return 'hello world'; };`);
    expect(devoutput).toContain(`exports.a = `);
  });

  it('should have amd module syntax in prodmode', () => {
    expect(fs.readFileSync(prodmodeOutput, {encoding: 'utf-8'}))
        .toContain(
            `define("build_bazel_rules_nodejs/packages/concatjs/test/target_module_attributes/a", ["require", "exports"], function (require, exports) {`);
  });

  it('should have es5 in prodmode', () => {
    const prodoutput = fs.readFileSync(prodmodeOutput, {encoding: 'utf-8'});

    expect(prodoutput).toContain(`a = function () { return 'hello world'; };`);
    expect(prodoutput).toContain(`exports.a = `);
  });
});