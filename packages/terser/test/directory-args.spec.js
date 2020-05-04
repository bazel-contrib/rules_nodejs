const {directoryArgs} = require('build_bazel_rules_nodejs/packages/terser/index')
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');

describe('directoryArgs', () => {
  it('return a new array ref', () => {
    const args = ['--source-map', '', ''];
    expect(directoryArgs(args, '')).not.toBe(args);
  });

  it('should not return a new array ref with source-maps arg ', () => {
    const args = [];
    expect(directoryArgs(args)).toBe(args);
  });

  it('should set the correct file url and souremap content', () => {
    const out = tmp.dirSync().name;
    const input = path.join(out, 'file.js');
    const output = '/test/file.js';
    const args = [
      '--ie8',
      '--source-map',
      `root='http://foo.com/src',url='some_wrong_name',content=inline`,
      '--keep-fnames',
    ];
    // if no corresponding map file exists then sourcemap content should
    // be left as inline
    expect(directoryArgs(args, input, output)).toEqual([
      '--ie8',
      '--source-map',
      `root='http://foo.com/src',url='${path.basename(output)}.map',content=inline`,
      '--keep-fnames',
    ]);
    // if a corresponding map file exists then sourcemap content should be set
    // to the  map file
    fs.writeFileSync(`${input}.map`, '');
    expect(directoryArgs(args, input, output)).toEqual([
      '--ie8',
      '--source-map',
      `root='http://foo.com/src',url='${path.basename(output)}.map',content='${
          input.replace(/\\/g, '/')}.map'`,
      '--keep-fnames',
    ]);
  });
})