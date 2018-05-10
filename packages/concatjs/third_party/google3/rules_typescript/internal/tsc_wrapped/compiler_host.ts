import * as fs from 'fs';
import * as path from 'path';
import * as tsickle from 'tsickle';
import * as ts from 'typescript';

import {FileLoader} from './file_cache';
import * as perfTrace from './perf_trace';
import {BazelOptions} from './tsconfig';
import {DEBUG, debug} from './worker';

export type ModuleResolver =
    (moduleName: string, containingFile: string,
     compilerOptions: ts.CompilerOptions, host: ts.ModuleResolutionHost) =>
        ts.ResolvedModuleWithFailedLookupLocations;

/**
 * Narrows down the type of some properties from non-optional to required, so
 * that we do not need to check presence before each access.
 */
export interface BazelTsOptions extends ts.CompilerOptions {
  rootDirs: string[];
  rootDir: string;
  outDir: string;
}

export function narrowTsOptions(options: ts.CompilerOptions): BazelTsOptions {
  if (!options.rootDirs)
    throw new Error(`compilerOptions.rootDirs should be set by tsconfig.bzl`);
  if (!options.rootDir)
    throw new Error(`compilerOptions.rootDirs should be set by tsconfig.bzl`);
  if (!options.outDir)
    throw new Error(`compilerOptions.rootDirs should be set by tsconfig.bzl`);
  return options as BazelTsOptions;
}

function validateBazelOptions(bazelOpts: BazelOptions) {
  if (!bazelOpts.isJsTranspilation) return;

  if (bazelOpts.compilationTargetSrc &&
      bazelOpts.compilationTargetSrc.length > 1) {
    throw new Error("In JS transpilation mode, only one file can appear in " +
                    "bazelOptions.compilationTargetSrc.");
  }

  if (!bazelOpts.transpiledJsOutputFileName) {
    throw new Error("In JS transpilation mode, transpiledJsOutputFileName " +
                    "must be specified in tsconfig.");
  }
}

const TS_EXT = /(\.d)?\.tsx?$/;

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
  directoryExists?: (dir: string) => boolean;

  googmodule: boolean;
  es5Mode: boolean;
  prelude: string;
  untyped: boolean;
  typeBlackListPaths: Set<string>;
  transformDecorators: boolean;
  transformTypesToClosure: boolean;
  addDtsClutzAliases: boolean;
  isJsTranspilation: boolean;
  options: BazelTsOptions;
  host: ts.ModuleResolutionHost = this;

  constructor(
      public inputFiles: string[], options: ts.CompilerOptions,
      readonly bazelOpts: BazelOptions, private delegate: ts.CompilerHost,
      private fileLoader: FileLoader,
      private readonly allowActionInputReads: boolean,
      private moduleResolver: ModuleResolver = ts.resolveModuleName) {
    this.options = narrowTsOptions(options);
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

    // Override directoryExists so that TypeScript can automatically
    // include global typings from node_modules/@types
    // see getAutomaticTypeDirectiveNames in
    // TypeScript:src/compiler/moduleNameResolver
    // Do this for Bazel only - under Blaze we don't support such discovery.
    if (allowActionInputReads && delegate && delegate.directoryExists) {
      this.directoryExists = delegate.directoryExists.bind(delegate);
    }

    validateBazelOptions(bazelOpts);
    this.googmodule = bazelOpts.googmodule;
    this.es5Mode = bazelOpts.es5Mode;
    this.prelude = bazelOpts.prelude;
    this.untyped = bazelOpts.untyped;
    this.typeBlackListPaths = new Set(bazelOpts.typeBlackListPaths);
    this.transformDecorators = bazelOpts.tsickle;
    this.transformTypesToClosure = bazelOpts.tsickle;
    this.addDtsClutzAliases = bazelOpts.addDtsClutzAliases;
    this.isJsTranspilation = Boolean(bazelOpts.isJsTranspilation);
  }

  /**
   * For the given potentially absolute input file path (typically .ts), returns
   * the relative output path. For example, for
   * /path/to/root/blaze-out/k8-fastbuild/genfiles/my/file.ts, will return
   * my/file.js or my/file.closure.js (depending on ES5 mode).
   */
  relativeOutputPath(fileName: string) {
    let result = this.rootDirsRelative(fileName);
    result = result.replace(/(\.d)?\.[jt]sx?$/, '');
    if (!this.bazelOpts.es5Mode) result += '.closure';
    return result + '.js';
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
      // relativeRoots[i]/path/to/file -> path/to/file
      const rel = path.relative(dir, result);
      if (!rel.startsWith('..')) {
        result = rel;
        // relativeRoots is sorted longest first so we can short-circuit
        // after the first match
        break;
      }
    }
    return result;
  }

  /** Avoid using tsickle on files that aren't in srcs[] */
  shouldSkipTsickleProcessing(fileName: string): boolean {
    return this.bazelOpts.isJsTranspilation ||
           this.bazelOpts.compilationTargetSrc.indexOf(fileName) === -1;
  }

  /** Whether the file is expected to be imported using a named module */
  shouldNameModule(fileName: string): boolean {
    return this.bazelOpts.compilationTargetSrc.indexOf(fileName) !== -1;
  }

  /** Allows suppressing warnings for specific known libraries */
  shouldIgnoreWarningsForPath(filePath: string): boolean {
    return this.bazelOpts.ignoreWarningPaths.some(
        p => !!filePath.match(new RegExp(p)));
  }

  /**
   * fileNameToModuleId gives the module ID for an input source file name.
   * @param fileName an input source file name, e.g.
   *     /root/dir/bazel-out/host/bin/my/file.ts.
   * @return the canonical path of a file within blaze, without /genfiles/ or
   *     /bin/ path parts, excluding a file extension. For example, "my/file".
   */
  fileNameToModuleId(fileName: string): string {
    return this.relativeOutputPath(
        fileName.substring(0, fileName.lastIndexOf('.')));
  }

  /**
   * TypeScript SourceFile's have a path with the rootDirs[i] still present, eg.
   * /build/work/bazel-out/local-fastbuild/bin/path/to/file
   * @return the path without any rootDirs, eg. path/to/file
   */
  private rootDirsRelative(fileName: string): string {
    for (const root of this.options.rootDirs) {
      if (fileName.startsWith(root)) {
        // rootDirs are sorted longest-first, so short-circuit the iteration
        // see tsconfig.ts.
        return path.relative(root, fileName);
      }
    }
    return fileName;
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
    let resolvedPath: string|null = null;
    const resolved =
        this.moduleResolver(importPath, context, this.options, this);
    if (resolved && resolved.resolvedModule &&
        resolved.resolvedModule.resolvedFileName) {
      resolvedPath = resolved.resolvedModule.resolvedFileName;
      // /build/work/bazel-out/local-fastbuild/bin/path/to/file ->
      // path/to/file
      resolvedPath = this.rootDirsRelative(resolvedPath);
    } else {
      // importPath can be an absolute file path in google3.
      // Try to trim it as a path relative to bin and genfiles, and if so,
      // handle its file extension in the block below and prepend the workspace
      // name.
      const trimmed = this.rootDirsRelative(importPath);
      if (trimmed !== importPath) {
        resolvedPath = trimmed;
      }
    }
    if (resolvedPath) {
      // Strip file extensions.
      importPath = resolvedPath.replace(TS_EXT, '');
      // Make sure all module names include the workspace name.
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

  /**
   * Converts file path into a valid AMD module name.
   *
   * An AMD module can have an arbitrary name, so that it is require'd by name
   * rather than by path. See http://requirejs.org/docs/whyamd.html#namedmodules
   *
   * "However, tools that combine multiple modules together for performance need
   *  a way to give names to each module in the optimized file. For that, AMD
   *  allows a string as the first argument to define()"
   */
  amdModuleName(sf: ts.SourceFile): string|undefined {
    if (!this.shouldNameModule(sf.fileName)) return undefined;
    // /build/work/bazel-out/local-fastbuild/bin/path/to/file.ts
    // -> path/to/file
    let fileName = this.rootDirsRelative(sf.fileName).replace(TS_EXT, '');

    let workspace = this.bazelOpts.workspaceName;

    // Workaround https://github.com/bazelbuild/bazel/issues/1262
    //
    // When the file comes from an external bazel repository,
    // and TypeScript resolves runfiles symlinks, then the path will look like
    // output_base/execroot/local_repo/external/another_repo/foo/bar
    // We want to name such a module "another_repo/foo/bar" just as it would be
    // named by code in that repository.
    // As a workaround, check for the /external/ path segment, and fix up the
    // workspace name to be the name of the external repository.
    if (fileName.startsWith('external/')) {
      const parts = fileName.split('/');
      workspace = parts[1];
      fileName = parts.slice(2).join('/');
    }

    if (this.bazelOpts.moduleName) {
      const relativeFileName = path.relative(this.bazelOpts.package, fileName);
      if (!relativeFileName.startsWith('..')) {
        if (this.bazelOpts.moduleRoot &&
            this.bazelOpts.moduleRoot.replace(TS_EXT, '') ===
                relativeFileName) {
          return this.bazelOpts.moduleName;
        }
        // Support the common case of commonjs convention that index is the
        // default module in a directory.
        // This makes our module naming scheme more conventional and lets users
        // refer to modules with the natural name they're used to.
        if (relativeFileName === 'index') {
          return this.bazelOpts.moduleName;
        }
        return path.posix.join(this.bazelOpts.moduleName, relativeFileName);
      }
    }

    // path/to/file ->
    // myWorkspace/path/to/file
    return path.posix.join(workspace, fileName);
  }

  /** Loads a source file from disk (or the cache). */
  getSourceFile(
      fileName: string, languageVersion: ts.ScriptTarget,
      onError?: (message: string) => void) {
    return perfTrace.wrap(`getSourceFile ${fileName}`, () => {
      const sf = this.fileLoader.loadFile(fileName, fileName, languageVersion);
      if (!/\.d\.tsx?$/.test(fileName) &&
          (this.options.module === ts.ModuleKind.AMD ||
           this.options.module === ts.ModuleKind.UMD)) {
        const moduleName = this.amdModuleName(sf);
        if (sf.moduleName === moduleName || !moduleName) return sf;
        if (sf.moduleName) {
          throw new Error(
              `ERROR: ${sf.fileName} ` +
              `contains a module name declaration ${sf.moduleName} ` +
              `which would be overwritten with ${moduleName} ` +
              `by Bazel's TypeScript compiler.`);
        }
        // Setting the moduleName is equivalent to the original source having a
        // ///<amd-module name="some/name"/> directive
        sf.moduleName = moduleName;
      }
      return sf;
    });
  }

  writeFile(
      fileName: string, content: string, writeByteOrderMark: boolean,
      onError: ((message: string) => void) | undefined,
      sourceFiles: ReadonlyArray<ts.SourceFile>): void {
    perfTrace.wrap(
        `writeFile ${fileName}`,
        () => this.writeFileImpl(
            fileName, content, writeByteOrderMark, onError, sourceFiles || []));
  }

  writeFileImpl(
      fileName: string, content: string, writeByteOrderMark: boolean,
      onError: ((message: string) => void) | undefined,
      sourceFiles: ReadonlyArray<ts.SourceFile>): void {
    // Workaround https://github.com/Microsoft/TypeScript/issues/18648
    if ((this.options.module === ts.ModuleKind.AMD ||
         this.options.module === ts.ModuleKind.UMD) &&
        fileName.endsWith('.d.ts') && sourceFiles && sourceFiles.length > 0 &&
        sourceFiles[0].moduleName) {
      content =
          `/// <amd-module name="${sourceFiles[0].moduleName}" />\n${content}`;
    }
    fileName = this.flattenOutDir(fileName);

    if (this.bazelOpts.isJsTranspilation) {
      fileName = this.bazelOpts.transpiledJsOutputFileName!;
    } else if (!this.bazelOpts.es5Mode) {
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
    // Under Bazel, users do not declare deps[] on their node_modules.
    // This means that we do not list all the needed .d.ts files in the files[]
    // section of tsconfig.json, and that is what populates the knownFiles set.
    // In addition, the node module resolver may need to read package.json files
    // and these are not permitted in the files[] section.
    // So we permit reading node_modules/* from action inputs, even though this
    // can include data[] dependencies and is broader than we would like.
    // This should only be enabled under Bazel, not Blaze.
    if (this.allowActionInputReads && filePath.indexOf('/node_modules/') >= 0) {
      const result = this.fileLoader.fileExists(filePath);
      if (DEBUG && !result && this.delegate.fileExists(filePath)) {
        debug("Path exists, but is not registered in the cache", filePath);
        Object.keys((this.fileLoader as any).cache.lastDigests).forEach(k => {
          if (k.endsWith(path.basename(filePath))) {
            debug("  Maybe you meant to load from", k);
          }
        });
      }
      return result;
    }
    return this.knownFiles.has(filePath);
  }

  // Since we override getDefaultLibFileName below, we must also provide the
  // directory containing the file.
  // Otherwise TypeScript looks in C:\lib.xxx.d.ts for the default lib.
  getDefaultLibLocation(): string {
    return path.dirname(
        this.getDefaultLibFileName({target: ts.ScriptTarget.ES5}));
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    if (this.bazelOpts.nodeModulesPrefix) {
      return path.join(
          this.bazelOpts.nodeModulesPrefix, 'typescript/lib',
          ts.getDefaultLibFileName({target: ts.ScriptTarget.ES5}));
    }
    return this.delegate.getDefaultLibFileName(options);
  }

  realpath(s: string): string {
    // tsc-wrapped relies on string matching of file paths for things like the
    // file cache and for strict deps checking.
    // TypeScript will try to resolve symlinks during module resolution which
    // makes our checks fail: the path we resolved as an input isn't the same
    // one the module resolver will look for.
    // See https://github.com/Microsoft/TypeScript/pull/12020
    // So we simply turn off symlink resolution.
    return s;
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

  readFile(fileName: string): string|undefined {
    return this.delegate.readFile(fileName);
  }

  trace(s: string): void {
    console.error(s);
  }
}
