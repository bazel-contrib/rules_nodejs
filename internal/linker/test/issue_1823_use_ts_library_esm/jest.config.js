module.exports = {
  testEnvironment: 'node',
  transform: {'^.+\\.mjs?$': 'babel-jest'},
  testMatch: ['**/?(*.)(spec|test).?(m)js?(x)'],
  moduleFileExtensions: ['js', 'mjs'],
};
