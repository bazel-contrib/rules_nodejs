/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */"use strict";
describe('linker', () => {
    it('should link nested node modules', () => {
        const semverVersion = require(require.resolve('semver/package.json')).version;
        expect(semverVersion).toBe('1.0.0');
    });
    it('should get transitive nested node_modules from 1p dep', () => {
        const onepa = require('@test_multi_linker/onep-a');
        expect(onepa.semverVersion()).toBe('1.0.1');
    });
    it('should get semver from root pacakge.json (which is currently 5.6.0) if the is no transitive in 1p dep', () => {
        const onepb = require('@test_multi_linker/onep-b');
        const major = onepb.semver().major(onepb.semverVersion());
        expect(major).toBeGreaterThanOrEqual(5);
    });
});
