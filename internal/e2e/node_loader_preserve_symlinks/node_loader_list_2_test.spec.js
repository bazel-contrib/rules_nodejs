describe('node_loader_list_test', () => {
  it('should resolve minimist', () => {
    require('minimist');
    expect(true).toEqual(true);
  });

  it('should resolve tmp', () => {
    require('tmp');
    expect(true).toEqual(true);
  });

  it('should resolve @gregmagolan/test-a to version 0.0.1', () => {
    const testA = require('@gregmagolan/test-a');
    expect(testA).toEqual('test-a-0.0.1');
  });
});
