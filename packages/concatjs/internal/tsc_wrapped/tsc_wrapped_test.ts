import * as path from 'path';
import {ModulesManifest} from 'tsickle';
import * as ts from 'typescript';

import {UncachedFileLoader} from './cache';
import {CompilerHost} from './compiler_host';
import {constructManifest} from './manifest';
import {writeTempFile} from './test_support';
import {BazelOptions} from './tsconfig';

// tslint:disable-next-line:no-any mock for testing.
const throwingCompilerHostFake: ts.CompilerHost = null as any;

const testFileLoader = new UncachedFileLoader();

const relativeOutputPath = (f: string) => f;

type ModuleResolver =
    (moduleName: string, containingFile: string,
     compilerOptions: ts.CompilerOptions, host: ts.ModuleResolutionHost) =>
        ts.ResolvedModuleWithFailedLookupLocations;

describe('tsc wrapped', () => {
  function f(
      res: ModulesManifest, fname: string, module: string, deps: string[]) {
    res.addModule(fname, module);
    for (let i = 0; i < deps.length; i++) {
      res.addReferencedModule(fname, deps[i]);
    }
    return res;
  }

  it('produces a topo-sorted manifest', () => {
    const res = new ModulesManifest();
    f(res, 'src/f3.js', 'test$f3', ['test$f2', 'test$f1']);
    f(res, 'src/f2.js', 'test$f2',
      ['external$ts_source_not_included', 'test$f1']);
    f(res, 'src/f1.js', 'test$f1', []);
    expect(constructManifest(res, {relativeOutputPath})).toBe([
      'src/f1.js\n', 'src/f2.js\n', 'src/f3.js\n'
    ].join(''));
  });

  it('reports cyclical dependencies', () => {
    const res = new ModulesManifest();
    f(res, 'src/f2', 'src$f2', ['src$f3']);
    f(res, 'src/f3', 'src$f3', ['src$f1']);
    f(res, 'src/f1', 'src$f1', ['src$f2']);
    expect(() => constructManifest(res, {relativeOutputPath}))
        .toThrowError(/src\/f2 ->\nsrc\/f3 ->\nsrc\/f1 ->\nsrc\/f2/g);
  });

  it('toposorts diamonds', () => {
    //   t
    // l   r
    //   b
    const res = new ModulesManifest();
    f(res, 'bottom.js', 'bottom', ['left', 'right']);
    f(res, 'right.js', 'right', ['top']);
    f(res, 'left.js', 'left', ['top']);
    f(res, 'top.js', 'top', []);
    expect(constructManifest(res, {relativeOutputPath})).toBe([
      'top.js\n',
      'left.js\n',
      'right.js\n',
      'bottom.js\n',
    ].join(''));
  });

});

// Create something that looks like CompilerOptions.
const COMPILER_OPTIONS: ts.CompilerOptions = {
  rootDirs: [
    // Sorted by inverse length, as done by tsconfig.ts in production.
    '/root/google3/blaze-out/k8-fastbuild/genfiles',
    '/root/google3/blaze-out/k8-fastbuild/bin',
    '/root/google3',
  ],
  outDir: '/root/google3/blaze-out/k8-fastbuild/bin',
  rootDir: '/root/google3'
};


const defaultBazelOpts = {
  googmodule: true,
  workspaceName: 'google3',
  prelude: `goog.require('google3.third_party.javascript.tslib.tslib');`,
} as BazelOptions;

describe('compiler host', () => {
  const bazelOpts = {
    ...defaultBazelOpts,
    es5Mode: false,
  } as BazelOptions;

  it('looks up files', () => {
    const fn = writeTempFile('file_lookup', 'let x: number = 123;');
    const fn2 = writeTempFile('file_lookup2', 'let x: number = 124;');
    const host = new CompilerHost(
        [fn /* but not fn2! */], COMPILER_OPTIONS, bazelOpts,
        throwingCompilerHostFake, testFileLoader);
    expect(host.fileExists(fn)).toBe(true);
    expect(host.fileExists(fn2)).toBe(false);
  });

  describe('file writing', () => {
    let writtenFiles: {[key: string]: string};
    beforeEach(() => writtenFiles = {});

    const delegateHost = {
      writeFile: (fn: string, d: string) => {
        writtenFiles[fn.replace(/\\/g, '/')] = d;
      }
      // tslint:disable-next-line:no-any mock for testing.
    } as any;

    function createFakeModuleResolver(
        moduleRoots: {[moduleName: string]: string}): ModuleResolver {
      return (moduleName: string, containingFile: string,
              compilerOptions: ts.CompilerOptions,
              host: ts.ModuleResolutionHost) => {
        if (moduleName[0] === '.') {
          moduleName =
              path.posix.join(path.dirname(containingFile), moduleName);
        }
        for (const moduleRoot in moduleRoots) {
          if (moduleName.indexOf(moduleRoot) === 0) {
            const resolvedFileName = moduleRoots[moduleRoot] +
                moduleName.substring(moduleRoot.length) + '.d.ts';
            return {
              resolvedModule: {resolvedFileName, extension: ts.Extension.Dts},
              failedLookupLocations: []
            };
          }
        }

        return {
          resolvedModule:
              {resolvedFileName: moduleName, extension: ts.Extension.Dts},
          failedLookupLocations: []
        };
      };
    }

    function createFakeGoogle3Host({
      es5 = false,
      moduleRoots = {} as {[moduleName: string]: string},
      isJsTranspilation = false,
      transpiledJsOutputFileName = undefined as string | undefined,
      transpiledJsInputDirectory = undefined as string | undefined,
      transpiledJsOutputDirectory = undefined as string | undefined,
    } = {}) {
      const bazelOpts = {
        ...defaultBazelOpts,
        es5Mode: es5,
        isJsTranspilation,
        transpiledJsOutputFileName,
        transpiledJsInputDirectory,
        transpiledJsOutputDirectory,
      } as BazelOptions;
      return new CompilerHost(
          [], COMPILER_OPTIONS, bazelOpts, delegateHost, testFileLoader,
          createFakeModuleResolver(moduleRoots));
    }

    describe('converts path to module names', () => {
      let host: CompilerHost;
      beforeEach(() => {
        host = createFakeGoogle3Host({
          moduleRoots: {
            'module': 'path/to/module',
            'module2': 'path/to/module2',
            'path/to/module2': 'path/to/module2',
          },
        });
      });

      function expectPath(context: string, path: string) {
        return expect(host.pathToModuleName(context, path));
      }

      it('mangles absolute paths', () => {
        expectPath('whatever/context', 'some/absolute/module')
            .toBe('google3.some.absolute.module');
      });

      it('escapes special symbols', () => {
        expectPath('', 'some|123').toBe('google3.some$7c123');
        expectPath('', '1some|').toBe('google3.1some$7c');
        expectPath('', 'bar/foo.bam.ts').toBe('google3.bar.foo$2ebam');
        expectPath('', '-foo-').toBe('google3.$2dfoo$2d');
        // Underscore is unmodified, because it is common in google3 paths.
        expectPath('', 'foo_bar').toBe('google3.foo_bar');
      });

      it('resolves paths', () => {
        const context = 'path/to/module';

        expectPath(context, './module2').toBe('google3.path.to.module2');
        expectPath(context, '././module2').toBe('google3.path.to.module2');
        expectPath(context, '../to/module2').toBe('google3.path.to.module2');
        expectPath(context, '../to/.././to/module2')
            .toBe('google3.path.to.module2');
      });

      it('ignores extra google3 sections in paths', () => {
        expectPath('', 'google3/foo/bar').toBe('google3.foo.bar');
      });

      it('resolves absolute paths', () => {
        const context = 'path/to/module/dir/file';

        expectPath(context, '/root/google3/some/file.ts')
            .toBe('google3.some.file');
        expectPath(context, '/root/google3/path/to/some/file')
            .toBe('google3.path.to.some.file');
        expectPath(
            context, '/root/google3/blaze-out/k8-fastbuild/bin/some/file')
            .toBe('google3.some.file');
        expectPath(
            context, '/root/google3/blaze-out/k8-fastbuild/genfiles/some/file')
            .toBe('google3.some.file');
      });

      describe('uses module name for resolved file paths', () => {
        it('for goog.module module names', () => {
          expectPath('', 'module/dir/file2')
              .toBe('google3.path.to.module.dir.file2');
          expectPath('', 'module2/dir/file2')
              .toBe('google3.path.to.module2.dir.file2');
        });

        it('for imports of files from the same module', () => {
          const context = 'path/to/module/dir/file';

          expectPath(context, 'module/dir/file2')
              .toBe('google3.path.to.module.dir.file2');
          expectPath(context, './foo/bar')
              .toBe('google3.path.to.module.dir.foo.bar');
          expectPath(context, '../foo/bar')
              .toBe('google3.path.to.module.foo.bar');
          expectPath(context, 'path/to/module/dir/file2')
              .toBe('google3.path.to.module.dir.file2');
        });

        it('for imports of files from a different module', () => {
          const context = 'path/to/module/dir/file';

          expectPath(context, 'module2/dir/file')
              .toBe('google3.path.to.module2.dir.file');
          expectPath(context, '../../module2/dir/file')
              .toBe('google3.path.to.module2.dir.file');
          expectPath(context, 'path/to/module2/dir/file')
              .toBe('google3.path.to.module2.dir.file');
        });
      });
    });

    describe('output files', () => {
      it('writes to .mjs in ES6 mode', () => {
        createFakeGoogle3Host({
          es5: false,
        }).writeFile('a.js', 'some.code();', false, undefined, []);
        expect(Object.keys(writtenFiles)).toEqual([
          '/root/google3/blaze-out/k8-fastbuild/bin/a.mjs'
        ]);
      });

      it('writes to .js in ES5 mode', () => {
        createFakeGoogle3Host({
          es5: true,
        }).writeFile('a/b.js', 'some.code();', false, undefined, []);
        expect(Object.keys(writtenFiles)).toEqual([
          '/root/google3/blaze-out/k8-fastbuild/bin/a/b.js'
        ]);
      });

      describe('transpiled JS', () => {
        it('writes to transpiledJsOutputFileName', () => {
          const host = createFakeGoogle3Host({
            isJsTranspilation: true,
            transpiledJsOutputFileName: 'foo/bar/a/b.dev_es5.js',
          });
          host.writeFile('a/b.js', 'some.code();', false, undefined, []);
          expect(Object.keys(writtenFiles)).toEqual([
            '/root/google3/blaze-out/k8-fastbuild/bin/foo/bar/a/b.dev_es5.js'
          ]);
        });

        it('writes to transpiledJsOutputDirectory', () => {
          const host = createFakeGoogle3Host({
            isJsTranspilation: true,
            transpiledJsInputDirectory: 'foo/bar/jsinputdir',
            transpiledJsOutputDirectory: 'foo/bar/jsoutputdir',
          });
          host.writeFile(
              'foo/bar/jsinputdir/a/b.js', 'some.code();', false, undefined,
              []);
          expect(Object.keys(writtenFiles)).toEqual([
            '/root/google3/blaze-out/k8-fastbuild/bin/foo/bar/jsoutputdir/a/b.js'
          ]);
        });
      });
    });
  });
});
