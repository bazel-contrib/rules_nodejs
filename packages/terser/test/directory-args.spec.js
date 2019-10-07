const {directoryArgs} = require('npm_bazel_terser/index')

describe('directoryArgs', () => {
  it('return a new array ref', () => {
    const args = ['--source-map', ''];
    expect(directoryArgs(args, '')).not.toBe(args);
  });

  it('should not return a new array ref with source-maps arg ', () => {
    const args = [];
    expect(directoryArgs(args)).toBe(args);
  });

  it('should replace the directory url with the file url', () => {
    const args = [
      '--ie8',
      '--source-map',
      `root='http://foo.com/src',url='some_wrong_name'`,
      '--keep-fnames',
    ];
    const output = '/test/file.js';
    expect(directoryArgs(args, output)).toEqual([
      '--ie8',
      '--source-map',
      `root='http://foo.com/src',url='file.js.map'`,
      '--keep-fnames',
    ]);
  });
})