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
            `define("rules_nodejs/packages/typescript/test/target_module_attributes/a", ["require", "exports"], function (require, exports) {`);
  });

  it('should have es5 in devmode', () => {
    expect(fs.readFileSync(devmodeOutput, {
      encoding: 'utf-8'
    })).toContain(`exports.a = function () { return 'hello world'; };`);
  });

  it('should have amd module syntax in prodmode', () => {
    expect(fs.readFileSync(prodmodeOutput, {encoding: 'utf-8'}))
        .toContain(
            `define("rules_nodejs/packages/typescript/test/target_module_attributes/a", ["require", "exports"], function (require, exports) {`);
  });

  it('should have es5 in prodmode', () => {
    expect(fs.readFileSync(prodmodeOutput, {
      encoding: 'utf-8'
    })).toContain(`exports.a = function () { return 'hello world'; };`);
  });
});
