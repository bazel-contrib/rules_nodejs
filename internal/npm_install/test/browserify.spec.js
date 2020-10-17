const fs = require('fs');
const path = require('path');
const mainFile = 'rules_nodejs/third_party/npm/node_modules/browserify/index.js';
const directory = 'rules_nodejs/internal/npm_install/test';

describe('our bundled, vendored browserify binary', () => {
  it('should preserve licenses', () => {
    const idxFile = fs.readFileSync(require.resolve(mainFile), {encoding: 'utf-8'});
    expect(idxFile).toContain('Copyright Joyent');
    expect(idxFile).toMatch(/Copyright \d+ Mozilla/);
    expect(idxFile).toContain('The Dojo Foundation');
  });
  it('should have a minimist named AMD module', () => {
    const umd = require.resolve(path.join(directory, 'minimist.umd.js'));
    expect(fs.readFileSync(umd, {encoding: 'utf-8'})).toContain(`define('minimist'`);
  });
  it('should have a typeorm named AMD module', () => {
    const umd = require.resolve(path.join(directory, 'typeorm.umd.js'));
    expect(fs.readFileSync(umd, {encoding: 'utf-8'})).toContain(`define('typeorm'`);
  });
  it('should have a rxjs named AMD module', () => {
    const umd = require.resolve(path.join(directory, 'rxjs.umd.js'));
    expect(fs.readFileSync(umd, {encoding: 'utf-8'})).toContain(`define('rxjs'`);
  });
  it('should have a sinon named AMD module', () => {
    const umd = require.resolve(path.join(directory, 'sinon.umd.js'));
    expect(fs.readFileSync(umd, {encoding: 'utf-8'})).toContain(`define('sinon'`);
  });
  it('should have a core-util-is named AMD module', () => {
    const umd = require.resolve(path.join(directory, 'core-util-is.umd.js'));
    expect(fs.readFileSync(umd, {encoding: 'utf-8'})).toContain(`define('core-util-is'`);
  });
  it('should work', () => {
    const minimist = require(path.join(directory, 'minimist.umd.js'));
    const result = minimist('h');
    expect(result._[0]).toBe('h');
  });
  it('should work for package that imports built-ins ' +
         '(regression test for #771)',
     () => {
       const coreUtilIsUmd = require(path.join(directory, 'core-util-is.umd.js'));
     });
});
