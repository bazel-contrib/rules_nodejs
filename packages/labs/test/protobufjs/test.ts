const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']!);
const {TestMessage} = require(runfiles.resolvePackageRelative('test_ts_proto.js'));

describe('protobufjs', () => {
  it('should work in node', () => {
    expect(TestMessage.verify({
      testField: 'Hello',
    })).toBeFalsy();  // verify returns an error if failed
  });
});
