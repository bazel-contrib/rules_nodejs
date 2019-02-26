const fs = require('fs');
const UTF = {
  encoding: 'utf-8'
};

describe('webpack bundle', () => {
  it('should work', () => {
    let out = '';
    const originalErr = console.error;
    console.error = (m) => out = m;
    require('e2e_webpack/bundle.js');
    expect(out).toBe('Hello, Webpack');
    console.error = originalErr;
  });
});