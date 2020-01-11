const fs = require('fs');
const path = require('path');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('terser on a directory', () => {
  it('should produce an output for each input', () => {
    const out = runfiles.resolvePackageRelative('out.min');
    expect(fs.existsSync(out + '/input1.js')).toBeTruthy();
    expect(fs.existsSync(out + '/input2.js')).toBeTruthy();
  });

  it('should link the source to the source map', () => {
    const minFile = runfiles.resolvePackageRelative('out.min') + '/input1.js';
    const expectedSourceMapUrl = runfiles.resolvePackageRelative('out.min') + '/input1.js.map';
    const content = fs.readFileSync(minFile, 'utf8');
    const sourceMapLine = content.split(/r?\n/).find(l => l.startsWith('//#'));

    expect(sourceMapLine).toBeDefined();

    const [_, sourceMapUrl] = sourceMapLine.split('=');

    expect(sourceMapUrl).toEqual(path.basename(expectedSourceMapUrl));
  })
});
