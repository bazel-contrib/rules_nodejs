import * as main from './main';
import * as ts from 'typescript';

describe('main', () => {
  it('should compile and run without npm package', () => {
    expect(main.test()).toEqual('test');
  });

  it('runtime version of typescript should be correct', () => {
    expect(ts.version).toEqual('3.1.6');
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
