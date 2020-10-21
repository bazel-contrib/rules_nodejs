import 'jasmine';

import * as ts from 'typescript';

import {CompilerHost} from './compiler_host';
import {BazelOptions} from './tsconfig';
import { FileLoader } from './cache';

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

    describe('#pathToModuleName', () => {
      it('should escape non-identifier characters', () => {
        expect(defaultHost.pathToModuleName('context', '$-!@'))
            .toBe('$24$2d$21$40');
      });

      it('should escape leading numbers', () => {
        expect(defaultHost.pathToModuleName('context', '1234')).toBe('$31234');
      });

      it('should transform slashes to dots', () => {
        expect(defaultHost.pathToModuleName('context', 'a/b')).toBe('a.b');
      });

      it('should not escape valid identifers', () => {
        expect(defaultHost.pathToModuleName('context', 'a1/b2')).toBe('a1.b2');
      });
    });
  });

  describe('#getSourceFile', () => {

    it('should not leak generated AMD module name between compilations with cache', () => {
      const compilerOpts: ts.CompilerOptions = {
        rootDirs: ['.'],
        rootDir: '.',
        outDir: './dist',
        module: ts.ModuleKind.AMD,
      };
      const bazelOptions = {
        workspaceName: 'my_wksp',
        package: 'src/test',
        compilationTargetSrc: ["test.ts"]
      };
      const originalFile = ts.createSourceFile('test.ts', 'export const X = 1;',
          ts.ScriptTarget.ES2015, true);
      const fileLoader: FileLoader = {
        fileExists: () => true,
        loadFile: () => originalFile, 
      };
      const tsHost = ts.createCompilerHost(compilerOpts, true);
      const umdBuildHost = new CompilerHost([], compilerOpts,
          bazelOptions as any, tsHost, fileLoader);
      const es2015BuildHost = new CompilerHost([], {...compilerOpts, module: ts.ModuleKind.ES2015},
          bazelOptions as any, tsHost, fileLoader);

      expect(umdBuildHost.getSourceFile('test.ts', ts.ScriptTarget.ES2015).moduleName)
        .toBe('my_wksp/test');
      expect(es2015BuildHost.getSourceFile('test.ts', ts.ScriptTarget.ES2015).moduleName)
        .toBe(undefined, 'Expected source file to not have module name from previous host.');
    });
  });
});
