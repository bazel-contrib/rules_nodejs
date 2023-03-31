const fs = require('fs');
const path = require('path');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

process.chdir(runfiles.resolveWorkspaceRelative('internal/pkg_web/test/pkg'));

describe('pkg_web', () => {
  it('should have the right contents', () => {
    expect(fs.readdirSync('.')).toEqual([
      'bundle.es2015.js',
      'bundle.es2015.js.map',
      'bundle.js',
      'bundle.js.map',
      'index.html',
    ]);
  });

  it('should replace stamp info', () => {
    expect(fs.readFileSync('bundle.js', 'utf-8')).toContain('v1.2.3');
  });
});
