const {decrement} = require('./decrement');

describe('decrementing', () => {
  it('should do that', () => {
    assert.equal(decrement(1), 0);
  });
});