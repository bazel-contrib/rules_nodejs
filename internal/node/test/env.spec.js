const fs = require('fs');
const path = require('path');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const isWindows = process.platform === 'win32';
const runfilesExt = isWindows ? 'bat' : 'sh';

function normPath(p) {
  let result = p.replace(/\\/g, '/');
  if (isWindows) {
    // On Windows, we normalize to lowercase for so path mismatches such as 'C:/Users' and
    // 'c:/users' don't break the specs.
    result = result.toLowerCase();
    if (/[a-zA-Z]\:/.test(result)) {
      // Handle c:/ and /c/ mismatch
      result = `/${result[0]}${result.slice(2)}`;
    }
  }
  return result;
}

function expectPathsToMatch(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    a = a.map(p => normPath(p));
    b = b.map(p => normPath(p));
    expect(a).toEqual(b);
  } else {
    expect(normPath(a)).toBe(normPath(b));
  }
}

describe('launcher.sh environment', function() {
  it('should setup correct bazel environment variables when in runfiles', function() {
    const runfilesRoot = normPath(process.env['RUNFILES_DIR']);
    const match = runfilesRoot.match(/\/bazel-out\//);
    expect(!!match).toBe(true);
    const execroot = runfilesRoot.slice(0, match.index);
    expectPathsToMatch(path.basename(runfilesRoot), `env_test.${runfilesExt}.runfiles`);
    expectPathsToMatch(process.env['BAZEL_WORKSPACE'], 'build_bazel_rules_nodejs');
    expectPathsToMatch(process.env['BAZEL_TARGET'], '//internal/node/test:env_test');
    expectPathsToMatch(process.cwd(), `${process.env['RUNFILES_DIR']}/build_bazel_rules_nodejs`);
    expectPathsToMatch(process.env['PWD'], `${process.env['RUNFILES_DIR']}/build_bazel_rules_nodejs`);
    expectPathsToMatch(process.env['BAZEL_NODE_MODULES_ROOTS'], ':npm');
    const expectedRoots = [
      `${execroot}`,
      `${execroot}/node_modules`,
      `${runfilesRoot}`,
      `${runfilesRoot}/build_bazel_rules_nodejs/node_modules`,
      `${execroot}/external/npm/node_modules`,
      `${runfilesRoot}/npm/node_modules`,
      `${runfilesRoot}/build_bazel_rules_nodejs/external/npm/node_modules`,
    ]
    expectPathsToMatch(process.env['BAZEL_PATCH_ROOTS'].split(','), expectedRoots);
  });

  it('should setup correct bazel environment variables when in execroot with no third party deps',
     function() {
       const env = require(runfiles.resolvePackageRelative('dump_build_env.json'));
       // On Windows, the RUNFILES path ends in a /MANIFEST segment in this context
       const runfilesRoot = normPath(isWindows ? path.dirname(env['RUNFILES']) : env['RUNFILES']);
       const match = runfilesRoot.match(/\/bazel-out\//);
       expect(!!match).toBe(true);
       const execroot = runfilesRoot.slice(0, match.index);
       expectPathsToMatch(path.basename(runfilesRoot), `dump_build_env.${runfilesExt}.runfiles`);
       expectPathsToMatch(env['BAZEL_WORKSPACE'], 'build_bazel_rules_nodejs');
       expectPathsToMatch(env['BAZEL_TARGET'], '//internal/node/test:dump_build_env');
       expectPathsToMatch(env['PWD'], execroot);
       // On Windows, an empty string value for 'BAZEL_NODE_MODULES_ROOTS' does not make it into
       // dump_build_env.json
       expectPathsToMatch(
           env['BAZEL_NODE_MODULES_ROOTS'] ? env['BAZEL_NODE_MODULES_ROOTS'] : '', '');
       const expectedRoots = [
         `${execroot}`,
         `${execroot}/node_modules`,
       ]
       expectPathsToMatch(env['BAZEL_PATCH_ROOTS'].split(','), expectedRoots);
     });

  it('should setup correct bazel environment variables when in execroot with third party deps',
     function() {
       const env = require(runfiles.resolvePackageRelative('dump_build_env_alt.json'));
       // On Windows, the RUNFILES path ends in a /MANIFEST segment in this context
       const runfilesRoot = normPath(isWindows ? path.dirname(env['RUNFILES']) : env['RUNFILES']);
       const match = runfilesRoot.match(/\/bazel-out\//);
       expect(!!match).toBe(true);
       const execroot = runfilesRoot.slice(0, match.index);
       expectPathsToMatch(
           path.basename(runfilesRoot), `dump_build_env_alt.${runfilesExt}.runfiles`);
       expectPathsToMatch(env['BAZEL_WORKSPACE'], 'build_bazel_rules_nodejs');
       expectPathsToMatch(env['BAZEL_TARGET'], '//internal/node/test:dump_build_env_alt');
       expectPathsToMatch(env['PWD'], execroot);
       expectPathsToMatch(env['BAZEL_NODE_MODULES_ROOTS'], ':npm');
       const expectedRoots = [
         `${execroot}`,
         `${execroot}/node_modules`,
         `${execroot}/external/npm/node_modules`,
       ]
       expectPathsToMatch(env['BAZEL_PATCH_ROOTS'].split(','), expectedRoots);
     });

  it('should setup correct bazel environment variables from env attr', function() {
    const env = require(runfiles.resolvePackageRelative('dump_build_env_attr.json'));
    expect(env['FOO']).toBe('BAR');
    expect(env['LOC']).toBe('build_bazel_rules_nodejs/internal/node/test/dump_build_env.js');
  });
});
