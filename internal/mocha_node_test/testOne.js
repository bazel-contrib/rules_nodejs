const assert = require('assert');

describe('mocha_node_test testOne', () => {
  it('should resolve module names via patched loader', () => {
    const content = require('example-lib').content;
    assert.equal(content, 'hello from example-lib');
  });
});
