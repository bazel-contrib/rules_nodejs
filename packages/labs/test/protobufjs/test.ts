import {TestMessage} from 'rules_nodejs/packages/labs/test/protobufjs/test_ts_proto';

describe('protobufjs', () => {
  it('should work in node', () => {
    expect(TestMessage.verify({
      testField: 'Hello',
    })).toBeFalsy();  // verify returns an error if failed
  });
});
