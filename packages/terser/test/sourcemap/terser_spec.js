const fs = require('fs');
const sm = require('source-map');
const DIR = 'build_bazel_rules_nodejs/packages/terser/test/sourcemap';
const DEBUG = process.env['COMPILATION_MODE'] === 'dbg';

describe('terser sourcemap handling', () => {
  it('should produce a sourcemap output', async () => {
    const file = require.resolve(DIR + '/src1.min.js.map');
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      const pos = consumer.originalPositionFor(
          // position of MyClass in terser_minified output src1.min.js
          // depends on DEBUG flag
          !DEBUG ? {line: 1, column: 18} : {line: 3, column: 5});
      expect(pos.source).toBe('src1.ts');
      expect(pos.line).toBe(2);
      expect(pos.column).toBe(14);
      expect(pos.name).toBe('MyClass');
    });
  });
});