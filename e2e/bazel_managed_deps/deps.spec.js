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
    const files = ['jasmine', 'tsc', 'tsserver'];
    for (const f of files) {
      try {
        expect(!!require.resolve(`.bin/${f}`)).toBeTruthy();
      } catch (_) {
        fail(`.bin/${f} not resolved`);
      }
    }
  });
});
