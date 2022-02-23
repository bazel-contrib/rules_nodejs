module.exports = {
  testEnvironment: 'node',
  haste: {
    enableSymlinks: true,
  },
  reporters: [
    'default', 
    ['jest-junit', { outputFile: process.env.XML_OUTPUT_FILE }]
  ],
  testMatch: ['**/*.test.js'],
  moduleNameMapper: {
    'examples_jest/(.*)': '<rootDir>/$1',
  },
};
