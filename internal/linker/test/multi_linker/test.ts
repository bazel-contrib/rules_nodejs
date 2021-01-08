describe('linker', () => {
  it('should link nested node modules', () => {
    // The nested internal/linker/test/multi_linker/package.json file pulls in semver 1.0.0
    // require('semver') should resolve to that version and not the root package.json version
    const semverVersion = require(require.resolve('semver/package.json')).version;
    expect(semverVersion).toBe('1.0.0');
  });

  it('should get transitive nested node_modules from 1p dep', () => {
    // The nested transitive internal/linker/test/multi_linker/onepa/package.json file pulls
    // in semver 1.0.1 into @onepa_npm_deps//:node_modules. onepa should find that version
    // as @onepa_npm_deps//:node_modules is pulled in transitively via
    // //internal/linker/test/multi_linker/onepa
    const onepa = require('@rules_nodejs/onepa');
    expect(onepa.semverVersion()).toBe('1.0.1');
  });

  it('should get semver from root pacakge.json (which is currently 5.6.0) if the is no transitive in 1p dep',
     () => {
       const onepb = require('@rules_nodejs/onepb');
       const major = onepb.semver().major(onepb.semverVersion());
       expect(major).toBeGreaterThanOrEqual(5);
     });
});
