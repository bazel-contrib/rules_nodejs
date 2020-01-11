const fs = require('fs');
const sm = require('source-map');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('terser on a directory with map files', () => {
  it('should produce an output for each input', () => {
    const out = runfiles.resolvePackageRelative('dir.min');
    expect(fs.existsSync(out + '/src1.js')).toBeTruthy();
  });

  it('should produce a sourcemap output', async () => {
    const out = runfiles.resolvePackageRelative('dir.min');
    const file = require.resolve(out + '/src1.js.map');
    const debugBuild = /\/bazel-out\/[^/\s]*-dbg\//.test(file);
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      const pos = consumer.originalPositionFor(
          // position of MyClass in terser_minified output src1.min.js
          // depends on COMPILATION_MODE
          !debugBuild ? {line: 1, column: 18} : {line: 3, column: 5});
      expect(pos.source).toBe('src1.ts');
      expect(pos.line).toBe(2);
      expect(pos.column).toBe(14);
      expect(pos.name).toBe('MyClass');
    });
  });
});