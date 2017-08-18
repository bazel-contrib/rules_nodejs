import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {CompilerHost} from './compiler_host';
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
