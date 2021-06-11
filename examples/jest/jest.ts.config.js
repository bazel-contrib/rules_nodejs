module.exports = {
  testEnvironment: 'node',
  haste: {
    enableSymlinks: true,
  },
  reporters: ['default'],
  testMatch: ['**/*.test.js'],
  moduleNameMapper: {
    'examples_jest/(.*)': '<rootDir>/$1',
  },
};
