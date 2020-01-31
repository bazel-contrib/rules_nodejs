import {TestMessage} from 'build_bazel_rules_nodejs/packages/labs/test/protobufjs/test_ts_proto';

// const TestMessage = build_bazel_rules_nodejs.packages.labs.test.protobufjs.TestMessage;

describe('protobufjs', () => {
  it('should work in node', () => {
    expect(TestMessage.verify({
      testField: 'Hello',
    })).toBeFalsy();  // verify returns an error if failed
  });
});
