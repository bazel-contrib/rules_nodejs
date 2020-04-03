const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('output tree spec resolves', () => {
  it('should resolve runfiles relative', () => {
    try {
      const json = require(runfiles.resolvePackageRelative('test.json'));
      expect(json.foo).toBe('bar');
    } catch (_) {
      fail(`runfiles.resolvePackageRelative('test.json') should be resolved`);
    }
  });
});
