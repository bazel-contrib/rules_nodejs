module.exports = {
  testEnvironment: 'node',
  reporters: ['default', './jest-reporter'],
  transform: {'^.+\\.jsx?$': 'babel-jest'},
  testMatch: ['**/*.test.js']
};
