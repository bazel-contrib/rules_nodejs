describe('vendored node', () => {
  it('version should be 10.12.0', () => {
    expect(process.version).toBe('v10.12.0');
  });
});
