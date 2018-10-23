const assert = require('assert');

describe('mocha_node_test fail_test', () => {
  it('should fail', () => {
    assert.equal(0,1);
  });
});
