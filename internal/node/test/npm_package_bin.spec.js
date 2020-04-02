const fs = require('fs');
const path = require('path');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

describe('npm_package_bin', function() {
  it('should output a minified.js when output_dir is False', function() {
    const content = fs.readFileSync(runfiles.resolvePackageRelative('minified.js'), 'utf-8');
    expect(content).toContain('{console.error("thing")}')
  });

  it('should output a directory artifact named after the target when output_dir is True',
     function() {
       const dir = fs.readdirSync(runfiles.resolvePackageRelative('dir_output'));
       expect(dir).toContain('terser_input.js');
     });
});
