describe('output tree spec resolves', () => {
  it('should resolve runfiles relative', () => {
    try {
      const json = require('./test.json');
      expect(json.foo).toBe('bar');
    } catch (_) {
      fail(`'./test.json' should be resolved`);
    }
  });
});
