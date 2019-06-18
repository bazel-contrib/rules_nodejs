const { isString } = require('./coverage_source');

describe('coverage function', () => {
  it('should cover one branch', () => {
    expect(isString(2)).toBe(false);
  });
  it('should cover the other branch', () => {
    expect(isString('some string')).toBe(true);
  });
  it('should point coverage to the test tmpdir',
     () => {expect(process.env['NODE_V8_COVERAGE']).toContain(process.env['TEST_TMPDIR'])})
});
