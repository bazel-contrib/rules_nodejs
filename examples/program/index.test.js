const expect = require('chai').expect;
const {increment} = require('./index');
const {decrement} = require('./decrement');

describe('incrementing', () => {
  it('should do that', () => {
    expect(increment(1)).to.equal(2);
  });
});

describe('decrementing', () => {
  it('should do that', () => {
    expect(decrement(1)).to.equal(0);
  });
});