const fs = require('fs');
const path = require('path');
const sm = require('source-map');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('terser sourcemap handling', () => {
  it('should produce a sourcemap output', async () => {
    const file = runfiles.resolvePackageRelative('out.min.js.map');
    const debugBuild = /\/bazel-out\/[^/\s]*-dbg\//.test(file);
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      // terser will produce different output based on DEBUG flag
      const pos =
          consumer.originalPositionFor(!debugBuild ? {line: 1, column: 89} : {line: 6, column: 22});
      expect(pos.name).toBe('something');
      expect(pos.line).toBe(3);
      expect(pos.column).toBe(14);
    });
  });

  it('should link the source to the source map', () => {
    const minFile = runfiles.resolvePackageRelative('out.min.js');
    const expectedSourceMapUrl = runfiles.resolvePackageRelative('out.min.js.map');
    const content = fs.readFileSync(minFile, 'utf8');
    const sourceMapLine = content.split(/r?\n/).find(l => l.startsWith('//#'));

    expect(sourceMapLine).toBeDefined();

    const [_, sourceMapUrl] = sourceMapLine.split('=');

    expect(sourceMapUrl).toEqual(path.basename(expectedSourceMapUrl));
  })
});
