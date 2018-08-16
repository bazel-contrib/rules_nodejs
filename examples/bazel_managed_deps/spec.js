const ts = require('typescript');

describe('dependencies', () => {
  it('should get the typescript library', () => {
    expect(ts.version).toBe('3.2.1');
  });
});
