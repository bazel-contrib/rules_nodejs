const {runGenerator, check, files} = require('./check');

describe('build file generator', () => {
  runGenerator();
  files.forEach(file => {
    it(`should produce a BUILD file for ${file}`, () => {
      check(file);
    });
  });
});
