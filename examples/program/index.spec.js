const path = require('path');
const {increment} = require('./index');
const {decrement} = require('./decrement');

describe('incrementing', () => {
  it('should do that', () => {
    expect(increment(1)).toBe(2);
  });
});

describe('decrementing', () => {
  it('should do that', () => {
    expect(decrement(1)).toBe(0);
  });
});

describe('packaging', () => {
  it('should include all files', () => {
    const dir = 'program_example/package';
    require.resolve(path.join(dir, 'index.js'));
    require.resolve(path.join(dir, 'package.json'));
  });
});
