const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const fs = require('fs');

describe('angular plugin', () => {
  it('should produce typings with Angular metadata', () => {
    expect(fs.readFileSync(runfiles.resolvePackageRelative('component.d.ts'), 'utf-8'))
        .toContain('ɵɵComponentDeclaration<Comp');
  });
  it('should produce JS code with Angular runtime', () => {
    expect(fs.readFileSync(runfiles.resolvePackageRelative('component.js'), 'utf-8'))
        .toContain('defineComponent({ type: Comp');
  });
});
