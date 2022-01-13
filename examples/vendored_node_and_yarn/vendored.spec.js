describe('node version', () => {
  it('should be the one we vendored', () => {
    expect(process.version).toBe('v15.0.1');
  });
});
