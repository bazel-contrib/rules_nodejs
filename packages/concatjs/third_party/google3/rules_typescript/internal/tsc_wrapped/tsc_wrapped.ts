import * as path from 'path';
import * as tsickle from 'tsickle';
import * as ts from 'typescript';

import {PLUGIN as tsetsePlugin} from '../tsetse/runner';

import {CachedFileLoader, FileLoader, ProgramAndFileCache, UncachedFileLoader} from './cache';
import {CompilerHost} from './compiler_host';
import * as diagnostics from './diagnostics';
import {wrap} from './perf_trace';
import {PLUGIN as strictDepsPlugin} from './strict_deps';
import {parseTsconfig, resolveNormalizedPath} from './tsconfig';
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

// The one ProgramAndFileCache instance used in this process.
const cache = new ProgramAndFileCache(debug);

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
  cache.resetStats();
  cache.traceStats();
  if (bazelOpts.maxCacheSizeMb !== undefined) {
    const maxCacheSizeBytes = bazelOpts.maxCacheSizeMb * 1 << 20;
    cache.setMaxCacheSize(maxCacheSizeBytes);
  } else {
    cache.resetMaxCacheSize();
  }

  let fileLoader: FileLoader;
  const allowActionInputReads = true;

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

  const compilerHostDelegate =
      ts.createCompilerHost({target: ts.ScriptTarget.ES5});

  const compilerHost = new CompilerHost(
      files, options, bazelOpts, compilerHostDelegate, fileLoader,
      allowActionInputReads);

  let oldProgram = cache.getProgram(bazelOpts.target);
  let program = ts.createProgram(files, options, compilerHost, oldProgram);
  cache.putProgram(bazelOpts.target, program);

  cache.traceStats();

  function isCompilationTarget(sf: ts.SourceFile): boolean {
    return (bazelOpts.compilationTargetSrc.indexOf(sf.fileName) !== -1);
  }
  let diags: ts.Diagnostic[] = [];
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
  const toEmit = program.getSourceFiles().filter(isCompilationTarget);
  const emitResults: ts.EmitResult[] = [];

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
    for (const sf of toEmit) {
      emitResults.push(optTsickle.emitWithTsickle(
          program, compilerHost, compilerHost, options, sf));
    }
    diags.push(
        ...optTsickle.mergeEmitResults(emitResults as tsickle.EmitResult[])
            .diagnostics);
  } else {
    for (const sf of toEmit) {
      emitResults.push(program.emit(sf));
    }

    for (const d of emitResults) {
      diags.push(...d.diagnostics);
    }
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
