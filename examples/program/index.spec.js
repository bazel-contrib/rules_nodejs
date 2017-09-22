const {increment} = require('./index');

describe('incrementing', () => {
  it('should do that', () => {
    expect(increment(1)).toBe(2);
  });
});
