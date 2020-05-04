const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('installing hybrid packages', () => {
  it('should work', () => {
    const content =
        fs.readFileSync(runfiles.resolve('npm/bazel_workspaces_consistent/a.txt'), 'utf-8');
    expect(content).toEqual('some content');
  });
});
