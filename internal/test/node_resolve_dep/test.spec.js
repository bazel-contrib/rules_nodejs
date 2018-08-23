const path = require('path');

const clangVersion =
    require(path.join(path.dirname(require.resolve('clang-format')), 'package.json')).version;

describe('clang-format version', () => {
  it('should be 1.0.0', () => {
    expect(clangVersion).toBe('1.0.0');
  });
});

const clangVersionRequired = require('./index').clangVersion;

describe('clang-format version from within require', () => {
  it('should be 1.0.0', () => {
    expect(clangVersionRequired).toBe('1.0.0');
  });
});
