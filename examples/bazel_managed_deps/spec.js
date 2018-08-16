const ts = require('typescript');

describe('dependencies', () => {
  it('should get the typescript library', () => {
    expect(ts.version).toBe('3.0.1');
  });
  it('should resolve @gregmagolan/test-b to version 0.0.2 with a @gregmagolan/test-a dependency of 0.0.1',
     () => {
       const testB = require('@gregmagolan/test-b');
       expect(testB).toEqual('test-b-0.0.2/test-a-0.0.1');
     });
});
