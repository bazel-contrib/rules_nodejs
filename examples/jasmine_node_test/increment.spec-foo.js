const {increment} = require('./increment');

describe('a increment JavaScript test with a "spec-foo" suffix', () => {
  it('should do that', () => {
    expect(increment(1)).toBe(2);
  });
});
