const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('bundling', () => {
  it('should work', () => {
    let written;
    console.log = (m) => written = m;
    const bundlePath = runfiles.resolveWorkspaceRelative('bundle.js');
    require(bundlePath);
    expect(written).toEqual('Hello, Bob');
  });
});
