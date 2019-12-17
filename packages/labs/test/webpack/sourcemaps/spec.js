const fs = require('fs');
const sm = require('source-map');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

describe('webpack sourcemap handling', () => {
  it('should produce a sourcemap output', async () => {
    const file = runfiles.resolvePackageRelative('bundle.js.map');
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      const pos = consumer.originalPositionFor({line: 1, column: 963});

      expect(pos.source.endsWith('s.js')).toBeTruthy();
      expect(pos.line).toBe(1);
      expect(pos.column).toBe(17);
    });
  });
});
