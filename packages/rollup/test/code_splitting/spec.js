const fs = require('fs');

describe('rollup code splitting', () => {
  it('should produce a chunk for lazy loaded code', () => {
    expect(fs.existsSync(require.resolve(__dirname + '/bundle/bundle.js'))).toBeTruthy();
    expect(fs.existsSync(require.resolve(__dirname + '/bundle/chunk.js'))).toBeTruthy();
  });
});
