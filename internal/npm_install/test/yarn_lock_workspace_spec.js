const parser = require('../generate_build_file');
const fs = require('fs');

describe('lock file marshaler', () => {
  it('should parse a yarn.lock file', () => {
    process.chdir('internal/npm_install/test')
    parser.main('./yarn.lock');
    var mainBuild = fs.readFileSync('BUILD.bazel', {encoding: 'utf-8'});
    expect(mainBuild).toContain(`filegroup(
      name = "node_modules",
      srcs = [
        balanced-match,brace-expansion,concat-map,fs.realpath,glob,inflight,inherits,jasmine,jasmine-core,minimatch,once,path-is-absolute,wrappy,@yarnpkg/lockfile
      ],
    )`);
  });
});
