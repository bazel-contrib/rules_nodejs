const fs = require('fs');

describe('bundling', () => {
  it('should work', () => {
    const actual = fs.readFileSync(require.resolve('./bundle.js'), { encoding: 'utf-8' });
    const expected = 'const name = \'Alice\';\n\nconsole.log(`Hello, ${name}`);\n';
    expect(actual).toEqual(expected);
  });
});