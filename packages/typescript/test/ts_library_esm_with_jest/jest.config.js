module.exports = {
  haste: {
    enableSymlinks: true,
  },
  testEnvironment: 'node',
  transform: {'^.+\\.mjs?$': ['babel-jest', {configFile: __dirname + '/.babelrc'}]},
  testMatch: ['**/?(*.)(spec|test).?(m)js?(x)'],
  moduleFileExtensions: ['js', 'mjs'],
};
