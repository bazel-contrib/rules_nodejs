const fs = require('fs');
const sm = require('source-map');

describe('rollup sourcemap handling', () => {
  it('should produce a sourcemap output', async () => {
    const file = require.resolve(__dirname + '/bundle/input.js.map');
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      const pos = consumer.originalPositionFor({line: 1, column: 12});
      // This doesn't work because the output dir is different from input
      // so it actually starts with a bunch of '/../..'
      // expect(pos.source).toBe('s.js');

      expect(pos.source.endsWith('s.js')).toBeTruthy();
      expect(pos.line).toBe(1);
      expect(pos.column).toBe(17);
    });
  });
});
