const fs = require('fs');
const path = require('path');

function read(p) {
  // We want to look up the test_pkg directory artifact in the runfiles.
  // The manifest does have an entry for it, but since it's a directory we cannot use
  // require.resolve to lookup that entry. So instead we lookup the sibling file in runfiles and
  // bootstrap the filesystem lookup from there.
  const dir = path.dirname(
      require.resolve('build_bazel_rules_nodejs/internal/npm_package/test/test_loader.js'));
  return fs.readFileSync(path.join(dir, 'test_pkg', p), {encoding: 'utf-8'}).trim();
}

describe('npm_package srcs', () => {
  it('copies srcs and replaces contents', () => {
    expect(read('some_file')).toEqual('replaced');
  });
  it('copies dependencies from bazel-genfiles', () => {
    expect(read('a_dep')).toEqual('a_dep content');
  });
  it('copies files from other packages', () => {
    expect(read('dependent_file')).toEqual('dependent_file content');
  });
  it('copies js files from ts_library', () => {
    expect(read('foo.js')).toEqual('export const a = \'\';');
  });
  it('copies declaration files from ts_library', () => {
    expect(read('foo.d.ts')).toEqual('export const a: string;');
  });
  it('copies data dependencies', () => {
    expect(read('data.json')).toEqual('[]');
  });
  it('replaced 0.0.0-PLACEHOLDER', () => {
    expect(read('package.json').version).not.toEqual('0.0.0-PLACEHOLDER');
  });
  it('copies files from deps', () => {
    expect(read('bundle.min.js')).toBe('bundle content');
  });
  it('copies files from external workspace if included in srcs', () => {
    expect(read('vendored_external_file')).toEqual('vendored_external_file content');
  });
  it('copies js files from external workspace ts_library if included in vendor_external', () => {
    expect(read('external.js')).toContain('exports.b = \'\';');
  });
  it('copies declaration files from external workspace ts_library if included in vendor_external',
     () => {
       expect(read('external.d.ts')).toContain('export declare const b: string;');
     });
  it('vendors external workspaces',
     () => {
         // TODO(alexeagle): there isn't a way to test this yet, because the npm_package under test
         // has to live in the root of the repository in order for external/foo to appear inside it
     });
});
