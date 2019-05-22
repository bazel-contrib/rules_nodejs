describe('dependencies', () => {
  it('should get the typescript library', () => {
    const ts = require('typescript');
    expect(ts.version).toBe('3.0.1');
  });

  it(`should resolve transitive dependencies
  Note that jasmine-core is not listed in our deps[]
  but it is a transitive dependency of jasmine, which is in our deps.`,
     () => {
       require('jasmine-core');
     });

  it('.bin files should be in runfiles via @npm//:bin_files data dep', () => {
    try {
      expect(require.resolve('.bin/jasmine').endsWith('npm/node_modules/.bin/jasmine')).toBe(true);
      expect(require.resolve('.bin/tsc').endsWith('npm/node_modules/.bin/tsc')).toBe(true);
      expect(require.resolve('.bin/tsserver').endsWith('npm/node_modules/.bin/tsserver'))
          .toBe(true);
    } catch (_) {
      fail('.bin file not resolved');
    }
  });
});
