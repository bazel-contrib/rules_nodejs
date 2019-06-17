const {check, files} = require('./check');
const {printPackageBin} = require('../generate_build_file');

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
});