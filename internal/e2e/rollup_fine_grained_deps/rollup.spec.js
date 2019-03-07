const {check, files} = require('./check');

describe('rollup', () => {
  files.forEach(file => {
    it(`should produce a valid bundle ${file}`, () => {
      check(file);
    });
  });
});
