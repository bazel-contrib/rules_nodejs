const fs = require('fs');
const mainFile = 'build_bazel_rules_nodejs/third_party/github.com/browserify/browserify/index.min.js';

describe('our bundled, vendored browserify binary', () => {
    it('should preserve licenses', () => {
        const idxFile = fs.readFileSync(require.resolve(mainFile), {encoding: 'utf-8'});
        expect(idxFile).toContain('Copyright Joyent');
        expect(idxFile).toMatch(/Copyright \d+ Mozilla/);
        expect(idxFile).toContain('Feross Aboukhadijeh');
    });
    it('should work', () => {
        const minimistUmd = require('build_bazel_rules_nodejs/internal/npm_install/test/some-package-name.umd.js');
        const result = minimistUmd('h');
        expect(result._[0]).toBe('h');
    });
});