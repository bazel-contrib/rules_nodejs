const {check, files} = require('./check');
const {printPackageBin, addDynamicDependencies} = require('../generate_build_file');

describe('build file generator', () => {
  describe('integration test', () => {
    files.forEach(file => {
      it(`should produce a BUILD file for ${file}`, () => {
        check(file);
      });
    });
  });

  describe('should exclude nodejs_binary rules when', () => {
    const pkg = {_name: 'some_name', _dir: 'some_dir', _dependencies: [], _files: []};

    it('no bin entry is provided', () => {
      expect(printPackageBin({...pkg, _files: []})).not.toContain('nodejs_binary(');
    });

    it('bin entry is null', () => {
      expect(printPackageBin({...pkg, _files: [], bin: null})).not.toContain('nodejs_binary(');
    });

    it('bin entry is undefined', () => {
      expect(printPackageBin({...pkg, _files: [], bin: undefined})).not.toContain('nodejs_binary(');
    });

    it('bin entry is empty string', () => {
      expect(printPackageBin({...pkg, _files: [], bin: ''})).not.toContain('nodejs_binary(');
    });

    it('bin entry is empty array', () => {
      expect(printPackageBin({...pkg, _files: [], bin: []})).not.toContain('nodejs_binary(');
    });

    it('bin entry is an array with an empty path', () => {
      expect(printPackageBin({...pkg, _files: [], bin: ['', null, undefined]}))
          .not.toContain('nodejs_binary(');
    });

    it('bin entry is empty object', () => {
      expect(printPackageBin({...pkg, _files: [], bin: {}})).not.toContain('nodejs_binary(');
    });

    it('bin entry is an object with an empty path', () => {
      expect(printPackageBin(
                 {...pkg, _files: [], bin: {empty_string: '', _null: null, _undefined: undefined}}))
          .not.toContain('nodejs_binary(');
    });

    it('bin entry is array of more than 1 element', () => {
      expect(printPackageBin({...pkg, _files: [], bin: ['some/path', 'some/other/path']}))
          .not.toContain('nodejs_binary(');
      expect(printPackageBin(
                 {...pkg, _files: [], bin: ['some/path', 'some/other/path', 'some/third/path']}))
          .not.toContain('nodejs_binary(');
    });

    it('bin entry is an empty array', () => {
      expect(printPackageBin({...pkg, _files: [], bin: []})).not.toContain('nodejs_binary(');
    });
  });

  describe('should include nodejs_binary rules when', () => {
    const pkg = {_name: 'some_name', _dir: 'some_dir', _dependencies: [], _files: []};

    it('bin entry is valid path', () => {
      expect(printPackageBin({...pkg, _files: [], bin: 'some/path'})).toContain('nodejs_binary(');
    });

    it('bin entry is valid path in array of 1 element', () => {
      expect(printPackageBin({...pkg, _files: [], bin: ['some/path']})).toContain('nodejs_binary(');
    });

    it('bin entry is valid path in object', () => {
      expect(printPackageBin({...pkg, _files: [], bin: {some_bin: 'some/path'}}))
          .toContain('nodejs_binary(');
    });
  });

  describe('dynamic dependencies', () => {
    it('should include requested dynamic dependencies in nodejs_binary data', () => {
      const pkgs = [
        {_name: 'foo', bin: 'foobin', _dir: 'some_dir', _moduleName: 'foo'},
        {_name: 'bar', _dir: 'bar', _moduleName: 'bar'},
        {_name: 'typescript', bin: 'tsc_wrapped', _dir: 'a', _moduleName: '@bazel/typescript'},
        {_name: 'tsickle', _dir: 'b', _moduleName: 'tsickle'},
      ];
      addDynamicDependencies(pkgs, {'foo': 'bar', '@bazel/typescript': 'tsickle'});
      expect(pkgs[0]._dynamicDependencies).toEqual(['//bar:bar']);
      expect(pkgs[2]._dynamicDependencies).toEqual(['//b:tsickle']);
      expect(printPackageBin(pkgs[0])).toContain('data = ["//some_dir:foo", "//bar:bar"]');
      expect(printPackageBin(pkgs[2])).toContain('data = ["//a:typescript", "//b:tsickle"]');
    });
    it('should support wildcard', () => {
      const pkgs = [
        {_name: 'foo', bin: 'foobin', _dir: 'some_dir', _moduleName: 'foo'},
        {_name: 'bar', _dir: 'bar', _moduleName: 'bar'}
      ];
      addDynamicDependencies(pkgs, {'foo': 'b*'});
      expect(pkgs[0]._dynamicDependencies).toEqual(['//bar:bar']);
      expect(printPackageBin(pkgs[0])).toContain('data = ["//some_dir:foo", "//bar:bar"]');
    });
    it('should automatically include plugins in nodejs_binary data', () => {
      const pkgs = [
        {_name: 'foo', bin: 'foobin', _dir: 'some_dir', _moduleName: 'foo'},
        {_name: 'foo-plugin-bar', _dir: 'bar', _moduleName: 'foo-plugin-bar'}
      ];
      addDynamicDependencies(pkgs, {});
      expect(pkgs[0]._dynamicDependencies).toEqual(['//bar:foo-plugin-bar']);
      expect(printPackageBin(pkgs[0]))
          .toContain('data = ["//some_dir:foo", "//bar:foo-plugin-bar"]');
    });
  });
});
