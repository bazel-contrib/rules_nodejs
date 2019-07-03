const fs = require('fs');
const mainFile = 'build_bazel_rules_nodejs/third_party/github.com/browserify/browserify/index.min.js';

describe('our bundled, vendored browserify binary', () => {
    it('should preserve licenses', () => {
        const idxFile = fs.readFileSync(require.resolve(mainFile), {encoding: 'utf-8'});
        expect(idxFile).toContain('Copyright Joyent');
        expect(idxFile).toMatch(/Copyright \d+ Mozilla/);
        expect(idxFile).toContain('The Dojo Foundation');
    });
    it('should have a named AMD module', () => {
        const minimistUmd = require.resolve('build_bazel_rules_nodejs/internal/npm_install/test/minimist.umd.js');
        expect(fs.readFileSync(minimistUmd, {encoding: 'utf-8'})).toContain(`define('minimist'`);
    });
    it('should work', () => {
        const minimist = require('build_bazel_rules_nodejs/internal/npm_install/test/minimist.umd.js');
        const result = minimist('h');
        expect(result._[0]).toBe('h');
    });
});