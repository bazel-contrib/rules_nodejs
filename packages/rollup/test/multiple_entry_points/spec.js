const fs = require('fs');

describe('rollup multiple entry points', () => {
  it('should produce a chunk for each entry point', () => {
    expect(fs.existsSync(require.resolve(__dirname + '/chunks/one.js'))).toBeTruthy();
    expect(fs.existsSync(require.resolve(__dirname + '/chunks/two.js'))).toBeTruthy();
  });
});
