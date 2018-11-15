import * as path from 'path';
import * as tsickle from 'tsickle';
import * as ts from 'typescript';

import {PLUGIN as tsetsePlugin} from '../tsetse/runner';

import {CachedFileLoader, FileLoader, ProgramAndFileCache, UncachedFileLoader} from './cache';
import {CompilerHost} from './compiler_host';
import * as bazelDiagnostics from './diagnostics';
import * as perfTrace from './perf_trace';
import {PLUGIN as strictDepsPlugin} from './strict_deps';
import {BazelOptions, parseTsconfig, resolveNormalizedPath} from './tsconfig';
import {debug, log, runAsWorker, runWorkerLoop} from './worker';

/**
 * Top-level entry point for tsc_wrapped.
 */
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

/** The one ProgramAndFileCache instance used in this process. */
const cache = new ProgramAndFileCache(debug);

function isCompilationTarget(
    bazelOpts: BazelOptions, sf: ts.SourceFile): boolean {
  return (bazelOpts.compilationTargetSrc.indexOf(sf.fileName) !== -1);
}

/**
 * Gather diagnostics from TypeScript's type-checker as well as other plugins we
 * install such as strict dependency checking.
 */
export function gatherDiagnostics(
    options: ts.CompilerOptions, bazelOpts: BazelOptions, program: ts.Program,
    disabledTsetseRules: string[]): ts.Diagnostic[] {
  // Install extra diagnostic plugins
  if (!bazelOpts.disableStrictDeps) {
    const ignoredFilesPrefixes: string[] = [];
    if (bazelOpts.nodeModulesPrefix) {
      // Under Bazel, we exempt external files fetched from npm from strict
      // deps. This is because we allow users to implicitly depend on all the
      // node_modules.
      // TODO(alexeagle): if users opt-in to fine-grained npm dependencies, we
      // should be able to enforce strict deps for them.
      ignoredFilesPrefixes.push(bazelOpts.nodeModulesPrefix);
      if (options.rootDir) {
        ignoredFilesPrefixes.push(
            path.resolve(options.rootDir!, 'node_modules'));
      }
    }
    program = strictDepsPlugin.wrap(program, {
      ...bazelOpts,
      rootDir: options.rootDir,
      ignoredFilesPrefixes,
    });
  }
  if (!bazelOpts.isJsTranspilation) {
    program = tsetsePlugin.wrap(program, disabledTsetseRules);
  }

  // TODO(alexeagle): support plugins registered by config

  const diagnostics: ts.Diagnostic[] = [];
  perfTrace.wrap('type checking', () => {
    // These checks mirror ts.getPreEmitDiagnostics, with the important
    // exception of avoiding b/30708240, which is that if you call
    // program.getDeclarationDiagnostics() it somehow corrupts the emit.
    perfTrace.wrap(`global diagnostics`, () => {
      diagnostics.push(...program.getOptionsDiagnostics());
      diagnostics.push(...program.getGlobalDiagnostics());
    });
    let sourceFilesToCheck: ReadonlyArray<ts.SourceFile>;
    if (bazelOpts.typeCheckDependencies) {
      sourceFilesToCheck = program.getSourceFiles();
    } else {
      sourceFilesToCheck = program.getSourceFiles().filter(
          f => isCompilationTarget(bazelOpts, f));
    }
    for (const sf of sourceFilesToCheck) {
      perfTrace.wrap(`check ${sf.fileName}`, () => {
        diagnostics.push(...program.getSyntacticDiagnostics(sf));
        diagnostics.push(...program.getSemanticDiagnostics(sf));
      });
      perfTrace.snapshotMemoryUsage();
    }
  });

  return diagnostics;
}

/**
 * Runs a single build, returning false on failure.  This is potentially called
 * multiple times (once per bazel request) when running as a bazel worker.
 * Any encountered errors are written to stderr.
 */
function runOneBuild(
    args: string[], inputs?: {[path: string]: string}): boolean {
  if (args.length !== 1) {
    console.error('Expected one argument: path to tsconfig.json');
    return false;
  }

  perfTrace.snapshotMemoryUsage();

  // Strip leading at-signs, used in build_defs.bzl to indicate a params file
  const tsconfigFile = args[0].replace(/^@+/, '');
  const [parsed, errors, {target}] = parseTsconfig(tsconfigFile);
  if (errors) {
    console.error(bazelDiagnostics.format(target, errors));
    return false;
  }
  if (!parsed) {
    throw new Error(
        'Impossible state: if parseTsconfig returns no errors, then parsed should be non-null');
  }
  const {options, bazelOpts, files, disabledTsetseRules} = parsed;

  if (bazelOpts.maxCacheSizeMb !== undefined) {
    const maxCacheSizeBytes = bazelOpts.maxCacheSizeMb * (1 << 20);
    cache.setMaxCacheSize(maxCacheSizeBytes);
  } else {
    cache.resetMaxCacheSize();
  }

  let fileLoader: FileLoader;
  if (inputs) {
    fileLoader = new CachedFileLoader(cache);
    // Resolve the inputs to absolute paths to match TypeScript internals
    const resolvedInputs = new Map<string, string>();
    for (const key of Object.keys(inputs)) {
      resolvedInputs.set(resolveNormalizedPath(key), inputs[key]);
    }
    cache.updateCache(resolvedInputs);
  } else {
    fileLoader = new UncachedFileLoader();
  }

  const perfTracePath = bazelOpts.perfTracePath;
  if (!perfTracePath) {
    return runFromOptions(
        fileLoader, options, bazelOpts, files, disabledTsetseRules);
  }

  log('Writing trace to', perfTracePath);
  const success = perfTrace.wrap(
      'runOneBuild',
      () => runFromOptions(
          fileLoader, options, bazelOpts, files, disabledTsetseRules));
  if (!success) return false;
  // Force a garbage collection pass.  This keeps our memory usage
  // consistent across multiple compilations, and allows the file
  // cache to use the current memory usage as a guideline for expiring
  // data.  Note: this is intentionally not within runFromOptions(), as
  // we want to gc only after all its locals have gone out of scope.
  global.gc();

  perfTrace.snapshotMemoryUsage();
  perfTrace.write(perfTracePath);

  return true;
}

// We only allow our own code to use the expected_diagnostics attribute
const expectDiagnosticsWhitelist: string[] = [
];

function runFromOptions(
    fileLoader: FileLoader, options: ts.CompilerOptions,
    bazelOpts: BazelOptions, files: string[],
    disabledTsetseRules: string[]): boolean {
  perfTrace.snapshotMemoryUsage();
  cache.resetStats();
  cache.traceStats();
  const compilerHostDelegate =
      ts.createCompilerHost({target: ts.ScriptTarget.ES5});

  const allowActionInputReads = true;
  const compilerHost = new CompilerHost(
      files, options, bazelOpts, compilerHostDelegate, fileLoader,
      allowActionInputReads);


  const oldProgram = cache.getProgram(bazelOpts.target);
  const program = perfTrace.wrap(
      'createProgram',
      () => ts.createProgram(
          compilerHost.inputFiles, options, compilerHost, oldProgram));
  cache.putProgram(bazelOpts.target, program);


  const compilationTargets =
      program.getSourceFiles().filter(f => isCompilationTarget(bazelOpts, f));
  const emitResults: ts.EmitResult[] = [];
  const diagnostics: ts.Diagnostic[] = [];
  if (bazelOpts.tsickle) {
    // The 'tsickle' import above is only used in type positions, so it won't
    // result in a runtime dependency on tsickle.
    // If the user requests the tsickle emit, then we dynamically require it
    // here for use at runtime.
    let optTsickle: typeof tsickle;
    try {
      // tslint:disable-next-line:no-require-imports dependency on tsickle only
      // if requested
      optTsickle = require('tsickle');
    } catch {
      throw new Error(
          'When setting bazelOpts { tsickle: true }, ' +
          'you must also add a devDependency on the tsickle npm package');
    }
    for (const sf of compilationTargets) {
      emitResults.push(optTsickle.emitWithTsickle(
          program, compilerHost, compilerHost, options, sf));
    }
    diagnostics.push(
        ...optTsickle.mergeEmitResults(emitResults as tsickle.EmitResult[])
            .diagnostics);
  } else {
    for (const sf of compilationTargets) {
      emitResults.push(program.emit(sf));
    }

    for (const d of emitResults) {
      diagnostics.push(...d.diagnostics);
    }
  }
  if (diagnostics.length > 0) {
    console.error(bazelDiagnostics.format(bazelOpts.target, diagnostics));
    return false;
  }

  cache.printStats();
  return true;
}


if (require.main === module) {
  // Do not call process.exit(), as that terminates the binary before
  // completing pending operations, such as writing to stdout or emitting the
  // v8 performance log. Rather, set the exit code and fall off the main
  // thread, which will cause node to terminate cleanly.
  process.exitCode = main(process.argv.slice(2));
}
