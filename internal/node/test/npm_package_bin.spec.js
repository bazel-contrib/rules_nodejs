const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const isWindows = process.platform === 'win32';

describe('npm_package_bin', function() {
  it('should output a minified.js when output_dir is False', function() {
    const content = fs.readFileSync(runfiles.resolvePackageRelative('minified.js'), 'utf-8');
    expect(content).toContain('{console.error("thing")}')
  });

  if (!isWindows) {
    // TODO: fix this linker assertion on Windows
    it('should be linkable via package_name to the package output directory when output_dir is False',
       function() {
         const content = fs.readFileSync(
             require.resolve('@rules_nodejs_tests/internal_node_test_run_terser/minified.js'),
             'utf-8');
         expect(content).toContain('{console.error("thing")}')
       });
  }

  it('should output a directory artifact named after the target when output_dir is True',
     function() {
       const dir = fs.readdirSync(runfiles.resolvePackageRelative('dir_output'));
       expect(dir).toContain('terser_input.js');
     });

  if (!isWindows) {
    // TODO: fix this linker assertion on Windows
    it('should be linkable via package_name to the rule output directory when output_dir is True',
       function() {
         const content = fs.readFileSync(
             require.resolve('@rules_nodejs_tests/internal_node_test_dir_output/terser_input.js'),
             'utf-8');
         expect(content).toContain('    console.error(\'thing\');')
       });
  }
});
