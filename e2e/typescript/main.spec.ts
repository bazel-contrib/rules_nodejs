import * as ts from 'typescript';

import * as main from './main';

describe('main', () => {
  it('should compile and run', () => {
    expect(main.test()).toEqual('test hello 02/Tu/2014');
  });

  it('should successfully require @bazel/concatjs', () => {
    try {
      require('@bazel/concatjs/internal/tsc_wrapped');
    } catch (e) {
      fail(e.toString())
    }
  });

  it('runtime version of typescript should be correct', () => {
    expect(ts.version).toEqual('4.3.2');
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
