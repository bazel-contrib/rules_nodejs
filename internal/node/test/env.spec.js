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
    if (/^[a-z]\:/.test(result)) {
      // Handle c:/ and /c/ mismatch
      result = `/${result[0]}${result.slice(2)}`;
    } else if (/^[a-z];[a-z]\:\/msys64/.test(result)) {
      // Handle c;b:/msys64/ and /b/ mismatch
      result = `/${result[2]}${result.slice(11)}`;
    } else if (/^[a-z];[a-z]\:/.test(result)) {
      // Handle c;b:/ and /c/b/ mismatch
      result = `/${result[0]}/${result[2]}${result.slice(4)}`;
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
    expectPathsToMatch(
      process.env['PWD'],
      `${process.env['RUNFILES_DIR']}/build_bazel_rules_nodejs`
    );
    // On Windows, an empty string value for 'BAZEL_NODE_MODULES_ROOTS' does not make it into
    // dump_build_env.json
    process.env['BAZEL_NODE_MODULES_ROOTS'] = process.env['BAZEL_NODE_MODULES_ROOTS'] || '';
    expectPathsToMatch(process.env['BAZEL_NODE_MODULES_ROOTS'], '');
    const expectedRoots = [
      `${execroot}`,
      `${execroot}/node_modules`,
      `${runfilesRoot}`,
      `${runfilesRoot}/build_bazel_rules_nodejs/node_modules`,
    ];
    if (isWindows) {
      expectedRoots.push(
        process.env['RUNFILES'],
        `${process.env['RUNFILES']}/build_bazel_rules_nodejs/node_modules`
      );
    }
    expectPathsToMatch(process.env['BAZEL_PATCH_ROOTS'].split(','), expectedRoots);
  });

  it('should setup correct bazel environment variables when in execroot with no third party deps', function() {
    const env = require(runfiles.resolvePackageRelative('dump_build_env.json'));
    // On Windows, an empty string value for 'BAZEL_NODE_MODULES_ROOTS' does not make it into
    // dump_build_env.json
    env['BAZEL_NODE_MODULES_ROOTS'] = env['BAZEL_NODE_MODULES_ROOTS'] || '';
    const runfilesRoot = normPath(env['RUNFILES']);
    const match = runfilesRoot.match(/\/bazel-out\//);
    expect(!!match).toBe(true);
    const execroot = runfilesRoot.slice(0, match.index);
    expectPathsToMatch(path.basename(runfilesRoot), `dump_build_env.${runfilesExt}.runfiles`);
    expectPathsToMatch(env['BAZEL_WORKSPACE'], 'build_bazel_rules_nodejs');
    expectPathsToMatch(env['BAZEL_TARGET'], '//internal/node/test:dump_build_env');
    expectPathsToMatch(env['PWD'], execroot);
    expectPathsToMatch(env['BAZEL_NODE_MODULES_ROOTS'], '');
    const expectedRoots = [
      `${execroot}`,
      `${execroot}/node_modules`,
      `${env['RUNFILES']}`,
      `${env['RUNFILES']}/${env['BAZEL_WORKSPACE']}/node_modules`,
    ];
    expectPathsToMatch(env['BAZEL_PATCH_ROOTS'].split(','), expectedRoots);
  });

  it('should setup correct bazel environment variables when in execroot with third party deps', function() {
    const env = require(runfiles.resolvePackageRelative('dump_build_env_alt.json'));
    // On Windows, an empty string value for 'BAZEL_NODE_MODULES_ROOTS' does not make it into
    // dump_build_env.json
    env['BAZEL_NODE_MODULES_ROOTS'] = env['BAZEL_NODE_MODULES_ROOTS'] || '';
    const runfilesRoot = normPath(env['RUNFILES']);
    const match = runfilesRoot.match(/\/bazel-out\//);
    expect(!!match).toBe(true);
    const execroot = runfilesRoot.slice(0, match.index);
    expectPathsToMatch(path.basename(runfilesRoot), `dump_build_env_alt.${runfilesExt}.runfiles`);
    expectPathsToMatch(env['BAZEL_WORKSPACE'], 'build_bazel_rules_nodejs');
    expectPathsToMatch(env['BAZEL_TARGET'], '//internal/node/test:dump_build_env_alt');
    expectPathsToMatch(env['PWD'], execroot);
    expectPathsToMatch(env['BAZEL_NODE_MODULES_ROOTS'], '');
    const expectedRoots = [
      `${execroot}`,
      `${execroot}/node_modules`,
      `${env['RUNFILES']}`,
      `${env['RUNFILES']}/${env['BAZEL_WORKSPACE']}/node_modules`,
    ];
    expectPathsToMatch(env['BAZEL_PATCH_ROOTS'].split(','), expectedRoots);
  });

  it('should setup correct bazel environment variables from env attr', function() {
    const env = require(runfiles.resolvePackageRelative('dump_build_env_attr.json'));
    expect(env['FOO']).toBe('BAR');
    expect(env['LOC']).toBe('build_bazel_rules_nodejs/internal/node/test/dump_build_env.js');
  });

  it('should expand make variables from env attr', function() {
      const env = require(runfiles.resolvePackageRelative('dump_build_env_attr.json'));
      expect(env['SOME_TEST_ENV']).toBe('some_value')
  });

  it('should correctly pass environment variables with backslashes', function() {
    const env = require(runfiles.resolvePackageRelative('dump_build_env_attr.json'));
    expect(env['BACKSLASHES']).toBe('C:\\some path\\on\\windows.exe');
  });
});
