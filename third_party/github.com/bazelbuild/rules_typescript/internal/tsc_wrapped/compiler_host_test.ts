import 'jasmine';

import * as ts from 'typescript';

import {CompilerHost} from './compiler_host';
import {BazelOptions} from './tsconfig';

describe('compiler host', () => {
  describe('computes the amd module name of a .ts source file', () => {
    const options: ts.CompilerOptions = {
      rootDirs: [],
      rootDir: 'base',
      outDir: 'out',
    };
    const bazelOptions: BazelOptions = {
      package: 'path/to/package',
      compilationTargetSrc: [
        'path/to/package/index.ts',
        'path/to/package/root_dir/index.ts',
        'test.ts',
      ],
      workspaceName: 'my_wksp',
    } as any;

    const defaultHost =
        new CompilerHost([], options, bazelOptions, null as any, null as any);
    // A module is a file with at least an import or export statement.
    function createTsModule(filename: string) {
      return ts.createSourceFile(filename, 'export {}', ts.ScriptTarget.ES2015);
    }

    it('should name a module after the workspace and filename', () => {
      expect(defaultHost.amdModuleName(createTsModule('test.ts')))
          .toBe('my_wksp/test');
    });

    it('should not provide a name for files that are not in the compilation unit',
       () => {
         expect(
             defaultHost.amdModuleName(createTsModule('some_other_file.d.ts')))
             .toBeUndefined();
       });

    it('should name the index file with a short name', () => {
      const host = new CompilerHost(
          [], options, {...bazelOptions, moduleName: 'my_lib'}, null as any,
          null as any);
      expect(host.amdModuleName(createTsModule('path/to/package/index.ts')))
          .toBe('my_lib');
    });
    it('should name an index file under a module_root with a short name',
       () => {
         const host = new CompilerHost(
             [], options,
             {...bazelOptions, moduleName: 'my_lib', moduleRoot: 'root_dir'},
             null as any, null as any);
         expect(host.amdModuleName(
                    createTsModule('path/to/package/root_dir/index.ts')))
             .toBe('my_lib');
       });
  });
});
