describe('node_loader_test', () => {
  it('should resolve minimist', () => {
    require('minimist');
    expect(true).toEqual(true);
  });

  it('should resolve tmp', () => {
    require('tmp');
    expect(true).toEqual(true);
  });
});
