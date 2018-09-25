import * as main from './main';

describe('main', () => {
  it('should compile and run with @bazel/typescript npm package', () => {
    expect(main.test()).toEqual('test');
  });
});
