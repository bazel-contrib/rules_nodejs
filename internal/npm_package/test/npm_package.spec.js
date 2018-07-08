const fs = require('fs');
const path = require('path');

function read(p) {
  // We want to look up the test_pkg directory artifact in the runfiles.
  // The manifest does have an entry for it, but since it's a directory we cannot use require.resolve
  // to lookup that entry.
  // So instead we lookup the sibling file (the primary output of the test rule)
  // and bootstrap the filesystem lookup from there.
  const dir =
      path.dirname(require.resolve('build_bazel_rules_nodejs/internal/npm_package/test/test.sh'));
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
  it('copies declaration files from ts_library', () => {
    expect(read('foo.d.ts')).toEqual('export const a: string;');
  });
  it('copies data dependencies', () => {
    expect(read('data.json')).toEqual('[]');
  });
});
