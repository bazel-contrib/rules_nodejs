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

  it('not mutate the args when theres no replacement token', () => {
    const args = ['--source-map', 'url=index.js.map'];
    const output = '/test/file.js';
    expect(directoryArgs(args, output)).toEqual(args);
  });

  it('should replace the <OUTPUT_MAP_FILE> with the basename', () => {
    const args = ['--source-map', `url='<OUTPUT_MAP_FILE>'`];
    const output = '/test/file.js';
    expect(directoryArgs(args, output)).toEqual(['--source-map', `url='file.js.map'`]);
  });
})