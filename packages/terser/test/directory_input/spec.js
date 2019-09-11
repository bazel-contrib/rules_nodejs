const fs = require('fs');

describe('terser on a directory', () => {
  it('should produce an output for each input', () => {
    expect(fs.existsSync(require.resolve(__dirname + '/out.min/input1.js'))).toBeTruthy();
    expect(fs.existsSync(require.resolve(__dirname + '/out.min/input2.js'))).toBeTruthy();
  });
});
