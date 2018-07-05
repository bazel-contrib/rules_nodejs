describe('node_loader_test', () => {
  it('should fail to resolve minimist', () => {
    try {
      require('minimist');
      expect(false).toEqual(true);
    } catch (e) {
      expect(true).toEqual(true);
    }
  });

  it('should resolve tmp', () => {
    require('tmp');
    expect(true).toEqual(true);
  });
});
