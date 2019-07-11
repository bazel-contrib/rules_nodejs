const fs = require('fs');
const path = require('path');
const mainFile = 'build_bazel_rules_nodejs/third_party/github.com/browserify/browserify/index.min.js';
const directory = 'build_bazel_rules_nodejs/internal/npm_install/test';

describe('our bundled, vendored browserify binary', () => {
    it('should preserve licenses', () => {
        const idxFile = fs.readFileSync(require.resolve(mainFile), {encoding: 'utf-8'});
        expect(idxFile).toContain('Copyright Joyent');
        expect(idxFile).toMatch(/Copyright \d+ Mozilla/);
        expect(idxFile).toContain('The Dojo Foundation');
    });
    it('should have a named AMD module', () => {
        const minimistUmd = require.resolve(path.join(directory, 'minimist.umd.js'));
        expect(fs.readFileSync(minimistUmd, {encoding: 'utf-8'})).toContain(`define('minimist'`);
    });
    it('should work', () => {
        const minimist = require(path.join(directory, 'minimist.umd.js'));
        const result = minimist('h');
        expect(result._[0]).toBe('h');
    });
    it('should work for package that imports built-ins ' +
      '(regression test for #771)', () => {
        const coreUtilIsUmd = require(path.join(directory, 'core-util-is.umd.js'));
    });
});