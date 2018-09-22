const check = require('./check');

describe('build file generator', () => {
  it('should produce a BUILD file from the node_modules file structure', () => {
    check();
  });
});
