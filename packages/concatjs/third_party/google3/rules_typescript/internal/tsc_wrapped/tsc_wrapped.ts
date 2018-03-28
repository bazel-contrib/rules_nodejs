import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {PLUGIN as tsetsePlugin} from '../tsetse/runner';

import {CompilerHost} from './compiler_host';
import * as diagnostics from './diagnostics';
import {CachedFileLoader, FileCache, FileLoader, UncachedFileLoader} from './file_cache';
import {wrap} from './perf_trace';
import {PLUGIN as strictDepsPlugin} from './strict_deps';
import {BazelOptions, parseTsconfig, resolveNormalizedPath} from './tsconfig';
import {fixUmdModuleDeclarations} from './umd_module_declaration_transform';
import {debug, log, runAsWorker, runWorkerLoop} from './worker';

export function main(args: string[]) {
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

/**
 * Runs a single build, returning false on failure.  This is potentially called
 * multiple times (once per bazel request) when running as a bazel worker.
 * Any encountered errors are written to stderr.
 */
function runOneBuild(
    args: string[], inputs?: {[path: string]: string}): boolean {
  // Strip leading at-signs, used in build_defs.bzl to indicate a params file
  const tsconfigFile = args[0].replace(/^@+/, '');

  const [parsed, errors, {target}] = parseTsconfig(tsconfigFile);
  if (errors) {
    console.error(diagnostics.format(target, errors));
    return false;
  }
  if (!parsed) {
    throw new Error(
        'Impossible state: if parseTsconfig returns no errors, then parsed should be non-null');
  }
  const {options, bazelOpts, files, disabledTsetseRules} = parsed;

  // Reset cache stats.
  fileCache.resetStats();
  fileCache.traceStats();
  if (bazelOpts.maxCacheSizeMb !== undefined) {
    const maxCacheSizeBytes = bazelOpts.maxCacheSizeMb * 1 << 20;
    fileCache.setMaxCacheSize(maxCacheSizeBytes);
  } else {
    fileCache.resetMaxCacheSize();
  }

  let fileLoader: FileLoader;
  const allowActionInputReads = true;

  if (inputs) {
    fileLoader = new CachedFileLoader(fileCache);
    // Resolve the inputs to absolute paths to match TypeScript internals
    const resolvedInputs: {[path: string]: string} = {};
    for (const key of Object.keys(inputs)) {
      resolvedInputs[resolveNormalizedPath(key)] = inputs[key];
    }
    fileCache.updateCache(resolvedInputs);
  } else {
    fileLoader = new UncachedFileLoader();
  }

  if (args.length !== 1) {
    console.error('Expected one argument: path to tsconfig.json');
    return false;
  }

  const compilerHostDelegate =
      ts.createCompilerHost({target: ts.ScriptTarget.ES5});

  const compilerHost = new CompilerHost(
      files, options, bazelOpts, compilerHostDelegate, fileLoader, allowActionInputReads);

  let program = ts.createProgram(files, options, compilerHost);

  fileCache.traceStats();

  function isCompilationTarget(sf: ts.SourceFile): boolean {
    return (bazelOpts.compilationTargetSrc.indexOf(sf.fileName) !== -1);
  }
  let diags: ts.Diagnostic[] = [];
  // Install extra diagnostic plugins
  if (!bazelOpts.disableStrictDeps) {
    const ignoredFilesPrefixes = [bazelOpts.nodeModulesPrefix];
    if (options.rootDir) {
      ignoredFilesPrefixes.push(
          path.resolve(options.rootDir, 'node_modules'));
    }
    program = strictDepsPlugin.wrap(program, {
      ...bazelOpts,
      rootDir: options.rootDir,
      ignoredFilesPrefixes,
    });
  }
  program = tsetsePlugin.wrap(program, disabledTsetseRules);

  // These checks mirror ts.getPreEmitDiagnostics, with the important
  // exception that if you call program.getDeclarationDiagnostics() it somehow
  // corrupts the emit.
  wrap(`global diagnostics`, () => {
    diags.push(...program.getOptionsDiagnostics());
    diags.push(...program.getGlobalDiagnostics());
  });
  let sourceFilesToCheck: ReadonlyArray<ts.SourceFile>;
  if (bazelOpts.typeCheckDependencies) {
    sourceFilesToCheck = program.getSourceFiles();
  } else {
    sourceFilesToCheck = program.getSourceFiles().filter(isCompilationTarget);
  }
  for (const sf of sourceFilesToCheck) {
    wrap(`check ${sf.fileName}`, () => {
      diags.push(...program.getSyntacticDiagnostics(sf));
      diags.push(...program.getSemanticDiagnostics(sf));
    });
  }

  // If there are any TypeScript type errors abort now, so the error
  // messages refer to the original source.  After any subsequent passes
  // (decorator downleveling or tsickle) we do not type check.
  diags = diagnostics.filterExpected(bazelOpts, diags);
  if (diags.length > 0) {
    console.error(diagnostics.format(bazelOpts.target, diags));
    return false;
  }

  for (const sf of program.getSourceFiles().filter(isCompilationTarget)) {
    const emitResult = program.emit(
        sf, /*writeFile*/ undefined,
        /*cancellationToken*/ undefined, /*emitOnlyDtsFiles*/ undefined, {
          after: [fixUmdModuleDeclarations(
              (sf: ts.SourceFile) => compilerHost.amdModuleName(sf))]
        });
    diags.push(...emitResult.diagnostics);
  }
  if (diags.length > 0) {
    console.error(diagnostics.format(bazelOpts.target, diags));
    return false;
  }
  return true;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
