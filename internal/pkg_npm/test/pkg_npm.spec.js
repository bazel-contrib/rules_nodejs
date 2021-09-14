const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const args = process.argv.slice(2);
const testPkgRootpath = args[0];
const testNoopPkgRootpath = args[1];
const testNoop2PkgRootpath = args[2];
const testPkgPath = runfiles.resolveWorkspaceRelative(testPkgRootpath);
const testNoopPkgPath = runfiles.resolveWorkspaceRelative(testNoopPkgRootpath);
const testNoop2PkgPath = runfiles.resolveWorkspaceRelative(testNoop2PkgRootpath);

function readFromPkg(p) {
  return fs.readFileSync(`${testPkgPath}/${p}`, {encoding: 'utf-8'}).trim();
}

function readFromNoopPkg(p) {
  return fs.readFileSync(`${testNoopPkgPath}/${p}`, {encoding: 'utf-8'}).trim();
}

function readFromNoop2Pkg(p) {
  return fs.readFileSync(`${testNoop2PkgPath}/${p}`, {encoding: 'utf-8'}).trim();
}

describe('pkg_npm', () => {
  it('creates an output directory after the rule name', () => {
    expect(testPkgRootpath).toEqual('internal/pkg_npm/test/test_pkg');
  });
  it('copies srcs and replaces contents', () => {
    expect(readFromPkg('some_file')).toEqual('replaced');
  });
  it('copies dependencies from bazel-genfiles', () => {
    expect(readFromPkg('a_dep')).toEqual('a_dep content');
  });
  it('copies files from other packages', () => {
    expect(readFromPkg('dependent_file')).toEqual('dependent_file content');
  });
  it('copies js files from ts_library', () => {
    expect(readFromPkg('foo.js')).toContain('exports.a = \'\';');
  });
  it('copies declaration files from ts_library', () => {
    expect(readFromPkg('foo.d.ts')).toContain('export declare const a: string;');
  });
  it('copies ESM files from ts_library', () => {
    expect(readFromPkg('foo.mjs')).toContain('export const a = \'\';');
  });
  it('copies data dependencies', () => {
    expect(readFromPkg('data.json')).toEqual('[]');
  });
  it('replaced 0.0.0-PLACEHOLDER', () => {
    expect(JSON.parse(readFromPkg('package.json')).version).toEqual('1.2.3');
  });
  it('copies files from deps', () => {
    expect(readFromPkg('bundle.min.js')).toBe('bundle content');
  });

  it('copies files from different output directories (when used with transitions)', () => {
    expect(readFromPkg('transition/test.js')).toEqual('OK');
  });

  it('copies files from external workspace if included in srcs', () => {
    expect(readFromPkg('vendored_external_file')).toEqual('vendored_external_file content');
  });
  it('copies js files from external workspace ts_library if included in vendor_external', () => {
    expect(readFromPkg('external.js')).toContain('exports.b = \'\';');
  });
  it('copies declaration files from external workspace ts_library if included in vendor_external',
     () => {
       expect(readFromPkg('external.d.ts')).toContain('export declare const b: string;');
     });
  it('vendors external workspaces',
     () => {
         // TODO(alexeagle): there isn't a way to test this yet, because the pkg_npm under test
         // has to live in the root of the repository in order for external/foo to appear inside it
     });
  it('copies entire contents of directories',
     () => {expect(readFromPkg('rollup/bundle/subdirectory/index.js'))
                .toContain(`const a = '';\n\nexport { a }`)});
  it('does not create an output directory if single dep is a directory artifact', () => {
    expect(testNoopPkgRootpath).toEqual('internal/pkg_npm/test/rollup/bundle/subdirectory');
  });
  it('re-roots to directory artifact if single dep is a directory artifact',
     () => {expect(readFromNoopPkg('index.js')).toContain(`const a = '';\n\nexport { a }`)});
  it('does not create an output directory if single dep is a directory artifact', () => {
    expect(testNoop2PkgRootpath).toEqual('internal/pkg_npm/test/rollup/bundle/subdirectory');
  });
  it('re-roots to directory artifact if single dep is a directory artifact',
     () => {expect(readFromNoop2Pkg('index.js')).toContain(`const a = '';\n\nexport { a }`)});
});
