const fs = require('fs');
const sm = require('source-map');

describe('terser sourcemap handling', () => {
  it('should produce a sourcemap output', async () => {
    const file = require.resolve(__dirname + '/out.min.js.map');
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      // terser will produce different output if the DEBUG environment variable is set
      const pos = consumer.originalPositionFor(
          !process.env['DEBUG'] ? {line: 1, column: 89} : {line: 6, column: 22});
      expect(pos.name).toBe('something');
      expect(pos.line).toBe(3);
      expect(pos.column).toBe(14);
    });
  });
});
