import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {CachedFileLoader, FileCache, FileLoader, UncachedFileLoader} from './file_cache';
import {BazelOptions, parseTsconfig} from './tsconfig';
import {debug, log, runAsWorker, runWorkerLoop} from './worker';

export function main(args) {
  if (runAsWorker(args)) {
    log('Starting TypeScript compiler persistent worker...');
    runWorkerLoop(runOneBuild);
    // Note: intentionally don't process.exit() here, because runWorkerLoop
    // is waiting for async callbacks from node.
  } else {
    debug('Running a single build...');
    if (args.length === 0) throw new Error('Not enough arguments');
    if (!runOneBuild(args)) {
      return 1;
    }
  }
  return 0;
}

// The one FileCache instance used in this process.
const fileCache = new FileCache<ts.SourceFile>(debug);

class CompilerHost implements ts.CompilerHost {

  /**
   * Lookup table to answer file stat's without looking on disk.
   */
  private knownFiles = new Set<string>();

  /**
   * rootDirs relative to the rootDir, eg "bazel-out/local-fastbuild/bin"
   */
  private relativeRoots: string[];

  constructor(
      public inputFiles: string[], readonly options: ts.CompilerOptions,
      readonly bazelOpts: BazelOptions, private delegate: ts.CompilerHost,
      private fileLoader: FileLoader) {
    // Try longest include directories first.
    this.options.rootDirs.sort((a, b) => b.length - a.length);
    this.relativeRoots =
        this.options.rootDirs.map(r => path.relative(this.options.rootDir, r));
    inputFiles.forEach((f) => {
      this.knownFiles.add(f);
    });
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

  /** Loads a source file from disk (or the cache). */
  getSourceFile(
      fileName: string, languageVersion: ts.ScriptTarget,
      onError?: (message: string) => void) {
    if (this.allowNonHermeticRead(fileName)) {
      // TODO(alexeagle): we could add these to the cache also
      return this.delegate.getSourceFile(fileName, languageVersion, onError);
    }
    return this.fileLoader.loadFile(fileName, fileName, languageVersion);
  }

  writeFile(
      fileName: string, content: string, writeByteOrderMark: boolean,
      onError?: (message: string) => void,
      sourceFiles?: ts.SourceFile[]): void {
    fileName = this.flattenOutDir(fileName);

    // Prepend the output directory.
    fileName = path.join(this.options.outDir, fileName);

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

function format(target: string, diagnostics: ts.Diagnostic[]): string {
  const diagnosticsHost: ts.FormatDiagnosticsHost = {
    ...ts.sys,
    getNewLine: () => ts.sys.newLine,
    getCanonicalFileName: (f: string) =>
        ts.sys.useCaseSensitiveFileNames ? f : f.toLowerCase()
  };
  return ts.formatDiagnostics(diagnostics, diagnosticsHost);
}

/**
 * Runs a single build, returning false on failure.  This is potentially called
 * multiple times (once per bazel request) when running as a bazel worker.
 * Any encountered errors are written to stderr.
 */
function runOneBuild(
    args: string[], inputs?: {[path: string]: string}): boolean {
  // Reset cache stats.
  fileCache.resetStats();
  fileCache.traceStats();
  let fileLoader: FileLoader;
  if (inputs) {
    fileLoader = new CachedFileLoader(fileCache);
    // Resolve the inputs to absolute paths to match TypeScript internals
    const resolvedInputs: {[path: string]: string} = {};
    for (const key of Object.keys(inputs)) {
      resolvedInputs[path.resolve(key)] = inputs[key];
    }
    fileCache.updateCache(resolvedInputs);
  } else {
    fileLoader = new UncachedFileLoader();
  }

  if (args.length !== 1) {
    console.error('Expected one argument: path to tsconfig.json');
    return false;
  }
  // Strip leading at-signs, used in build_defs.bzl to indicate a params file
  const tsconfigFile = args[0].replace(/^@+/, '');

  const [parsed, errors, {target}] = parseTsconfig(tsconfigFile);
  if (errors) {
    console.error(format(target, errors));
    return false;
  }
  const {options, bazelOpts, files} = parsed;
  const compilerHostDelegate =
      ts.createCompilerHost({target: ts.ScriptTarget.ES5});

  const compilerHost = new CompilerHost(
      files, options, bazelOpts, compilerHostDelegate, fileLoader);
  const program = ts.createProgram(files, options, compilerHost);

  fileCache.traceStats();

  function isCompilationTarget(sf: ts.SourceFile): boolean {
    return (bazelOpts.compilationTargetSrc.indexOf(sf.fileName) !== -1);
  }
  const diagnostics: ts.Diagnostic[] = [];
  // These checks mirror ts.getPreEmitDiagnostics, with the important
  // exception that if you call program.getDeclarationDiagnostics() it somehow
  // corrupts the emit.
  diagnostics.push(...program.getOptionsDiagnostics());
  diagnostics.push(...program.getGlobalDiagnostics());
  for (const sf of program.getSourceFiles().filter(isCompilationTarget)) {
    diagnostics.push(...program.getSyntacticDiagnostics(sf));
    diagnostics.push(...program.getSemanticDiagnostics(sf));
  }
  if (diagnostics.length > 0) {
    console.error(format(bazelOpts.target, diagnostics));
    return false;
  }
  for (const sf of program.getSourceFiles().filter(isCompilationTarget)) {
    const emitResult = program.emit(sf);
    diagnostics.push(...emitResult.diagnostics);
  }
  if (diagnostics.length > 0) {
    console.error(format(bazelOpts.target, diagnostics));
    return false;
  }
  return true;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
