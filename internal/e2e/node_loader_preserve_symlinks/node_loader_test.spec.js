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

  it('should resolve @gregmagolan/test-a to version 0.0.2', () => {
    const testA = require('@gregmagolan/test-a');
    expect(testA).toEqual('test-a-0.0.2');
  });

  it('should resolve @gregmagolan/test-b to version 0.0.2 with a @gregmagolan/test-a dependency of 0.0.1',
     () => {
       const testB = require('@gregmagolan/test-b');
       expect(testB).toEqual('test-b-0.0.2/test-a-0.0.1');
     });
});
