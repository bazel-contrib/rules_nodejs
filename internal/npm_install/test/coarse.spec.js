describe('dependencies', () => {
  it('it should resolve test-a@0.0.4 which is under node_modules/test-a', () => {
    const testA = require('@gregmagolan/test-a');
    expect(testA).toEqual('test-a-0.0.4');
  });
});
