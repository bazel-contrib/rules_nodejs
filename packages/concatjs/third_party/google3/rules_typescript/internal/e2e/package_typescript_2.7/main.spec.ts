import * as main from './main';

describe('main', () => {
  it('should compile and run with @bazel/typescript npm package', () => {
    expect(main.test()).toEqual('test');
  });

  it('should successfully require @bazel/typescript', () => {
    try {
      const {debug} = require('@bazel/typescript');
      debug('test');
    } catch (e) {
      fail(e.toString())
    }
  });

  it('should successfully require built-in node module \'os\'', () => {
    try {
      const os = require('os');
      console.log('Platform: ' + os.platform());
      console.log('Architecture: ' + os.arch());
    } catch (e) {
      fail(e.toString())
    }
  });
});
