import * as fs from 'fs';
import * as path from 'path';
import * as tsickle from 'tsickle';
import * as ts from 'typescript';

import {FileLoader} from './file_cache';
import * as perfTrace from './perf_trace';
import {BazelOptions} from './tsconfig';

export type ModuleResolver =
    (moduleName: string, containingFile: string,
     compilerOptions: ts.CompilerOptions, host: ts.ModuleResolutionHost) =>
        ts.ResolvedModuleWithFailedLookupLocations;

/**
 * CompilerHost that knows how to cache parsed files to improve compile times.
 */
export class CompilerHost implements ts.CompilerHost, tsickle.TsickleHost {
  /**
   * Lookup table to answer file stat's without looking on disk.
   */
  private knownFiles = new Set<string>();

  /**
   * rootDirs relative to the rootDir, eg "bazel-out/local-fastbuild/bin"
   */
  private relativeRoots: string[];

  getCancelationToken?: () => ts.CancellationToken;

  constructor(
      public inputFiles: string[], readonly options: ts.CompilerOptions,
      readonly bazelOpts: BazelOptions, private delegate: ts.CompilerHost,
      private fileLoader: FileLoader,
      private moduleResolver: ModuleResolver = ts.resolveModuleName) {
    // Try longest include directories first.
    this.options.rootDirs.sort((a, b) => b.length - a.length);
    this.relativeRoots =
        this.options.rootDirs.map(r => path.relative(this.options.rootDir, r));
    inputFiles.forEach((f) => {
      this.knownFiles.add(f);
    });

    // getCancelationToken is an optional method on the delegate. If we
    // unconditionally implement the method, we will be forced to return null,
    // in the absense of the delegate method. That won't match the return type.
    // Instead, we optionally set a function to a field with the same name.
    if (delegate && delegate.getCancellationToken) {
      this.getCancelationToken = delegate.getCancellationToken.bind(delegate);
    }
  }

  /**
   * Workaround https://github.com/Microsoft/TypeScript/issues/8245
   * We use the `rootDirs` property both for module resolution,
   * and *also* to flatten the structure of the output directory
   * (as `rootDir` would do for a single root).
   * To do this, look for the pattern outDir/relativeRoots[i]/path/to/file
   * or relativeRoots[i]/path/to/file
   * and replace that with path/to/file
   */
  flattenOutDir(fileName: string): string {
    let result = fileName;

    // outDir/relativeRoots[i]/path/to/file -> relativeRoots[i]/path/to/file
    if (fileName.startsWith(this.options.rootDir)) {
      result = path.relative(this.options.outDir, fileName);
    }

    for (const dir of this.relativeRoots) {
      if (result.startsWith(dir + '/')) {
        // relativeRoots[i]/path/to/file -> path/to/file
        result = path.relative(dir, result);
        // relativeRoots is sorted longest first so we can short-circuit
        // after the first match
        break;
      }
    }
    return result;
  }

  /**
   * Allow moduleResolution=node to behave normally.
   * Since we don't require users declare their dependencies within node_modules
   * we may need to read files that weren't explicit inputs.
   */
  allowNonHermeticRead(filePath: string) {
    return filePath.split(path.sep).indexOf('node_modules') != -1;
  }

  /** Avoid using tsickle on files that aren't in srcs[] */
  shouldSkipTsickleProcessing(fileName: string): boolean {
    return this.bazelOpts.compilationTargetSrc.indexOf(fileName) === -1;
  }

  /** Allows suppressing warnings for specific known libraries */
  shouldIgnoreWarningsForPath(filePath: string): boolean {
    return this.bazelOpts.ignoreWarningPaths.some(p => !!filePath.match(new RegExp(p)));
  }

  fileNameToModuleId(fileName: string): string {
    return this.flattenOutDir(fileName.substring(0, fileName.lastIndexOf('.')));
  }

  /**
   * Massages file names into valid goog.module names:
   * - resolves relative paths to the given context
   * - resolves non-relative paths which takes module_root into account
   * - replaces '/' with '.' in the '<workspace>' namespace
   * - replace first char if non-alpha
   * - replace subsequent non-alpha numeric chars
   */
  pathToModuleName(context: string, importPath: string): string {
    // tsickle hands us an output path, we need to map it back to a source
    // path in order to do module resolution with it.
    // outDir/relativeRoots[i]/path/to/file ->
    // rootDir/relativeRoots[i]/path/to/file
    if (context.startsWith(this.options.outDir)) {
      context = path.join(
          this.options.rootDir, path.relative(this.options.outDir, context));
    }

    // Try to get the resolved path name from TS compiler host which can
    // handle resolution for libraries with module_root like rxjs and @angular.
    const resolved =
        this.moduleResolver(importPath, context, this.options, this);
    if (resolved && resolved.resolvedModule &&
        resolved.resolvedModule.resolvedFileName) {
      let resolvedFileName = resolved.resolvedModule.resolvedFileName;

      // TypeScript gives us a path with the rootDirs[i] still present, eg.
      // /build/work/bazel-out/local-fastbuild/bin/path/to/file
      // We want path/to/file.
      for (const root of this.options.rootDirs) {
        if (resolvedFileName.startsWith(root)) {
          resolvedFileName = path.relative(root, resolvedFileName);
          break;  // rootDirs are sorted longest-first
        }
      }

      // Set the importPath to the resolved filename minus the extension.
      // Extension can either be '.d.ts' or anything after the last '.'.
      let index: number;
      if (resolvedFileName.match(/\.d\.ts$/)) {
        index = resolvedFileName.length - 5;
      } else {
        index = resolvedFileName.lastIndexOf('.');
      }
      importPath =
          index >= 0 ? resolvedFileName.substring(0, index) : resolvedFileName;

      if (importPath.indexOf(this.bazelOpts.workspaceName) !== 0) {
        importPath = path.join(this.bazelOpts.workspaceName, importPath);
      }
    }

    // Remove the __{LOCALE} from the module name.
    if (this.bazelOpts.locale) {
      const suffix = '__' + this.bazelOpts.locale.toLowerCase();
      if (importPath.toLowerCase().endsWith(suffix)) {
        importPath = importPath.substring(0, importPath.length - suffix.length);
      }
    }

    // Replace characters not supported by goog.module and '.' with
    // '$<Hex char code>' so that the original module name can be re-obtained
    // without any loss.
    // See goog.VALID_MODULE_RE_ in Closure's base.js for characters supported
    // by google.module.

    const escape = (c: string) => {
      return '$' + c.charCodeAt(0).toString(16);
    };
    const moduleName = importPath.replace(/^[^a-zA-Z_/]/, escape)
                           .replace(/[^a-zA-Z_0-9_/]/g, escape)
                           .replace(/\//g, '.');
    return moduleName;
  }

  /** Loads a source file from disk (or the cache). */
  getSourceFile(
      fileName: string, languageVersion: ts.ScriptTarget,
      onError?: (message: string) => void) {
    return perfTrace.wrap(`getSourceFile ${fileName}`, () => {
      if (this.allowNonHermeticRead(fileName)) {
        // TODO(alexeagle): we could add these to the cache also
        return this.delegate.getSourceFile(fileName, languageVersion, onError);
      }
      return this.fileLoader.loadFile(fileName, fileName, languageVersion);
    });
  }

  writeFile(
      fileName: string, content: string, writeByteOrderMark: boolean,
      onError?: (message: string) => void,
      sourceFiles?: ts.SourceFile[]): void {
    perfTrace.wrap(
        `writeFile ${fileName}`,
        () => this.writeFileImpl(
            fileName, content, writeByteOrderMark, onError, sourceFiles));
  }

  writeFileImpl(
      fileName: string, content: string, writeByteOrderMark: boolean,
      onError?: (message: string) => void,
      sourceFiles?: ts.SourceFile[]): void {
    fileName = this.flattenOutDir(fileName);
    if (!this.bazelOpts.es5Mode) {
      // Write ES6 transpiled files to *.closure.js.
      if (this.bazelOpts.locale) {
        // i18n paths are required to end with __locale.js so we put
        // the .closure segment before the __locale
        fileName = fileName.replace(/(__[^\.]+)?\.js$/, '.closure$1.js');
      } else {
        fileName = fileName.replace(/\.js$/, '.closure.js');
      }
    }

    // Prepend the output directory.
    fileName = path.join(this.options.outDir, fileName);

    // Our file cache is based on mtime - so avoid writing files if they
    // did not change.
    if (!fs.existsSync(fileName) ||
        fs.readFileSync(fileName, 'utf-8') !== content) {
      this.delegate.writeFile(
          fileName, content, writeByteOrderMark, onError, sourceFiles);
    }
  }

  /**
   * Performance optimization: don't try to stat files we weren't explicitly
   * given as inputs.
   * This also allows us to disable Bazel sandboxing, without accidentally
   * reading .ts inputs when .d.ts inputs are intended.
   * Note that in worker mode, the file cache will also guard against arbitrary
   * file reads.
   */
  fileExists(filePath: string): boolean {
    // Allow moduleResolution=node to behave normally.
    if (this.allowNonHermeticRead(filePath) &&
        this.delegate.fileExists(filePath)) {
      return true;
    }
    return this.knownFiles.has(filePath);
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    if (this.bazelOpts.nodeModulesPrefix) {
      return path.join(
          this.bazelOpts.nodeModulesPrefix, 'typescript/lib',
          ts.getDefaultLibFileName({target: ts.ScriptTarget.ES5}));
    }
    return this.delegate.getDefaultLibFileName(options);
  }

  // Delegate everything else to the original compiler host.

  getCanonicalFileName(path: string) {
    return this.delegate.getCanonicalFileName(path);
  }

  getCurrentDirectory(): string {
    return this.delegate.getCurrentDirectory();
  }

  useCaseSensitiveFileNames(): boolean {
    return this.delegate.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this.delegate.getNewLine();
  }

  getDirectories(path: string) {
    return this.delegate.getDirectories(path);
  }

  readFile(fileName: string): string {
    return this.delegate.readFile(fileName);
  }

  trace(s: string): void {
    console.error(s);
  }

  realpath(s: string): string {
    return ts.sys.realpath(s);
  }
}
