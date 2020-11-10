module.exports = {
  testEnvironment: 'node',
  reporters: ['default'],
  testMatch: ['**/*.test.js'],
  moduleNameMapper: {
    'examples_jest/(.*)': '<rootDir>/$1',
  },
};
