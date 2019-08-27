const fs = require('fs');
const sm = require('source-map');

describe('terser sourcemap handling', () => {
  it('should produce a sourcemap output', async () => {
    const file = require.resolve(__dirname + '/out.min.js.map');
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      const pos = consumer.originalPositionFor({line: 1, column: 89});
      expect(pos.name).toBe('something');
      expect(pos.line).toBe(3);
      expect(pos.column).toBe(14);
    });
  });
});
