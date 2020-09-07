const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('rollup', () => {
  it('should bundle absolute & relative imports', async () => {
    const file = runfiles.resolvePackageRelative('bundle.js');
    const bundle = fs.readFileSync(file, 'utf-8');
    expect(bundle).toContain(`const foo = 'foo';`);
    expect(bundle).toContain(`const bar = 'bar';`);
  });
});
