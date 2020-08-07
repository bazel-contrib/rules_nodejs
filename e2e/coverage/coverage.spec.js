const {isString} = require('./coverage_source');

describe('coverage function', () => {
  it('should cover one branch', () => {
    expect(isString(2)).toBe(false);
  });
  it('should cover the other branch', () => {
    expect(isString('some string')).toBe(true);
  });
});
