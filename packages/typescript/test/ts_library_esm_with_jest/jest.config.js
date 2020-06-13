module.exports = {
  testEnvironment: 'node',
  transform: {'^.+\\.mjs?$': ['babel-jest', {configFile: __dirname + '/.babelrc'}]},
  testMatch: ['**/?(*.)(spec|test).?(m)js?(x)'],
  moduleFileExtensions: ['js', 'mjs'],
};
