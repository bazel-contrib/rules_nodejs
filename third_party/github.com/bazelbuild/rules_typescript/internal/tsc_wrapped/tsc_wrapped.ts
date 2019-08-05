import * as fs from 'fs';
import * as path from 'path';
import * as tsickle from 'tsickle';
import * as ts from 'typescript';

import {Plugin as BazelConformancePlugin} from '../tsetse/runner';

import {CachedFileLoader, FileLoader, ProgramAndFileCache, UncachedFileLoader} from './cache';
import {CompilerHost} from './compiler_host';
import * as bazelDiagnostics from './diagnostics';
import {constructManifest} from './manifest';
import * as perfTrace from './perf_trace';
import {DiagnosticPlugin, PluginCompilerHost, TscPlugin} from './plugin_api';
import {Plugin as StrictDepsPlugin} from './strict_deps';
import {BazelOptions, parseTsconfig, resolveNormalizedPath} from './tsconfig';
import {debug, log, runAsWorker, runWorkerLoop} from './worker';

// Equivalent of running node with --expose-gc
// but easier to write tooling since we don't need to inject that arg to
// nodejs_binary
if (typeof global.gc !== 'function') {
  require('v8').setFlagsFromString('--expose_gc');
  global.gc = require('vm').runInNewContext('gc');
}

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
  if (bazelOpts.isJsTranspilation && bazelOpts.transpiledJsInputDirectory) {
    // transpiledJsInputDirectory is a relative logical path, so we cannot
    // compare it to the resolved, absolute path of sf here.
    // compilationTargetSrc is resolved, so use that for the comparison.
    return sf.fileName.startsWith(bazelOpts.compilationTargetSrc[0]);
  }
  return (bazelOpts.compilationTargetSrc.indexOf(sf.fileName) !== -1);
}

/**
 * Gather diagnostics from TypeScript's type-checker as well as other plugins we
 * install such as strict dependency checking.
 */
export function gatherDiagnostics(
    options: ts.CompilerOptions, bazelOpts: BazelOptions, program: ts.Program,
    disabledTsetseRules: string[], angularPlugin?: TscPlugin,
    plugins: DiagnosticPlugin[] = []): ts.Diagnostic[] {
  // Install extra diagnostic plugins
  plugins.push(
      ...getCommonPlugins(options, bazelOpts, program, disabledTsetseRules));
  if (angularPlugin) {
    program = angularPlugin.wrap(program);
  }

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
    for (const plugin of plugins) {
      perfTrace.wrap(`${plugin.name} diagnostics`, () => {
        for (const sf of sourceFilesToCheck) {
          perfTrace.wrap(`${plugin.name} checking ${sf.fileName}`, () => {
            const pluginDiagnostics = plugin.getDiagnostics(sf).map((d) => {
              return tagDiagnosticWithPlugin(plugin.name, d);
            });
            diagnostics.push(...pluginDiagnostics);
          });
          perfTrace.snapshotMemoryUsage();
        }
      });
    }
  });

  return diagnostics;
}

/**
 * Construct diagnostic plugins that we always want included.
 *
 * TODO: Call sites of getDiagnostics should initialize plugins themselves,
 *   including these, and the arguments to getDiagnostics should be simplified.
 */
export function*
    getCommonPlugins(
        options: ts.CompilerOptions, bazelOpts: BazelOptions,
        program: ts.Program,
        disabledTsetseRules: string[]): Iterable<DiagnosticPlugin> {
  if (!bazelOpts.disableStrictDeps) {
    if (options.rootDir == null) {
      throw new Error(`StrictDepsPlugin requires that rootDir be specified`);
    }
    yield new StrictDepsPlugin(program, {
      ...bazelOpts,
      rootDir: options.rootDir,
    });
  }
  if (!bazelOpts.isJsTranspilation) {
    let tsetsePluginConstructor:
        {new (program: ts.Program, disabledRules: string[]): DiagnosticPlugin} =
            BazelConformancePlugin;
    yield new tsetsePluginConstructor(program, disabledTsetseRules);
  }
}

/**
 * Returns a copy of diagnostic with one whose text has been prepended with
 * an indication of what plugin contributed that diagnostic.
 *
 * This is slightly complicated because a diagnostic's message text can be
 * split up into a chain of diagnostics, e.g. when there's supplementary info
 * about a diagnostic.
 */
function tagDiagnosticWithPlugin(
    pluginName: string, diagnostic: Readonly<ts.Diagnostic>): ts.Diagnostic {
  const tagMessageWithPluginName = (text: string) => `[${pluginName}] ${text}`;

  let messageText;
  if (typeof diagnostic.messageText === 'string') {
    // The simple case, where a diagnostic's message is just a string.
    messageText = tagMessageWithPluginName(diagnostic.messageText);
  } else {
    // In the case of a chain of messages we only want to tag the head of the
    //   chain, as that's the first line of message on the CLI.
    const chain: ts.DiagnosticMessageChain = diagnostic.messageText;
    messageText = {
      ...chain,
      messageText: tagMessageWithPluginName(chain.messageText)
    };
  }
  return {
    ...diagnostic,
    messageText,
  };
}

/**
 * expandSourcesFromDirectories finds any directories under filePath and expands
 * them to their .js or .ts contents.
 */
function expandSourcesFromDirectories(fileList: string[], filePath: string) {
  if (!fs.statSync(filePath).isDirectory()) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') ||
        filePath.endsWith('.js')) {
      fileList.push(filePath);
    }
    return;
  }
  const entries = fs.readdirSync(filePath);
  for (const entry of entries) {
    expandSourcesFromDirectories(fileList, path.join(filePath, entry));
  }
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
  const {
    options,
    bazelOpts,
    files,
    disabledTsetseRules,
    angularCompilerOptions
  } = parsed;

  const sourceFiles: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    expandSourcesFromDirectories(sourceFiles, filePath);
  }

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
        fileLoader, options, bazelOpts, sourceFiles, disabledTsetseRules,
        angularCompilerOptions);
  }

  log('Writing trace to', perfTracePath);
  const success = perfTrace.wrap(
      'runOneBuild',
      () => runFromOptions(
          fileLoader, options, bazelOpts, sourceFiles, disabledTsetseRules,
          angularCompilerOptions));
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
    bazelOpts: BazelOptions, files: string[], disabledTsetseRules: string[],
    angularCompilerOptions?: {[key: string]: unknown}): boolean {
  perfTrace.snapshotMemoryUsage();
  cache.resetStats();
  cache.traceStats();

  const compilerHostDelegate =
      ts.createCompilerHost({target: ts.ScriptTarget.ES5});

  const moduleResolver = bazelOpts.isJsTranspilation ?
      makeJsModuleResolver(bazelOpts.workspaceName) :
      ts.resolveModuleName;
  const tsickleCompilerHost = new CompilerHost(
      files, options, bazelOpts, compilerHostDelegate, fileLoader,
      moduleResolver);
  let compilerHost: PluginCompilerHost = tsickleCompilerHost;
  const diagnosticPlugins: DiagnosticPlugin[] = [];

  let angularPlugin: TscPlugin|undefined;
  if (bazelOpts.compileAngularTemplates) {
    try {
      const ngOptions = angularCompilerOptions || {};
      // Add the rootDir setting to the options passed to NgTscPlugin.
      // Required so that synthetic files added to the rootFiles in the program
      // can be given absolute paths, just as we do in tsconfig.ts, matching
      // the behavior in TypeScript's tsconfig parsing logic.
      ngOptions['rootDir'] = options.rootDir;

      // Dynamically load the Angular compiler installed as a peerDep
      const ngtsc = require('@angular/compiler-cli');
      angularPlugin = new ngtsc.NgTscPlugin(ngOptions);
    } catch (e) {
      console.error(e);
      throw new Error(
          'when using `ts_library(compile_angular_templates=True)`, ' +
          'you must install @angular/compiler-cli');
    }

    // Wrap host only needed until after Ivy cleanup
    // TODO(alexeagle): remove after ngsummary and ngfactory files eliminated
    compilerHost = angularPlugin!.wrapHost!(files, compilerHost);
  }


  const oldProgram = cache.getProgram(bazelOpts.target);
  const program = perfTrace.wrap(
      'createProgram',
      () => ts.createProgram(
          compilerHost.inputFiles, options, compilerHost, oldProgram));
  cache.putProgram(bazelOpts.target, program);


  if (!bazelOpts.isJsTranspilation) {
    // If there are any TypeScript type errors abort now, so the error
    // messages refer to the original source.  After any subsequent passes
    // (decorator downleveling or tsickle) we do not type check.
    let diagnostics = gatherDiagnostics(
        options, bazelOpts, program, disabledTsetseRules, angularPlugin,
        diagnosticPlugins);
    if (!expectDiagnosticsWhitelist.length ||
        expectDiagnosticsWhitelist.some(p => bazelOpts.target.startsWith(p))) {
      diagnostics = bazelDiagnostics.filterExpected(
          bazelOpts, diagnostics, bazelDiagnostics.uglyFormat);
    } else if (bazelOpts.expectedDiagnostics.length > 0) {
      console.error(
          `Only targets under ${
              expectDiagnosticsWhitelist.join(', ')} can use ` +
              'expected_diagnostics, but got',
          bazelOpts.target);
    }

    if (diagnostics.length > 0) {
      console.error(bazelDiagnostics.format(bazelOpts.target, diagnostics));
      debug('compilation failed at', new Error().stack!);
      return false;
    }
  }

  const compilationTargets = program.getSourceFiles().filter(
      fileName => isCompilationTarget(bazelOpts, fileName));

  let diagnostics: ts.Diagnostic[] = [];
  let useTsickleEmit = bazelOpts.tsickle;
  let transforms: ts.CustomTransformers = {
    before: [],
    after: [],
    afterDeclarations: [],
  };

  if (angularPlugin) {
    transforms = angularPlugin.createTransformers!(compilerHost);
  }

  if (useTsickleEmit) {
    diagnostics = emitWithTsickle(
        program, tsickleCompilerHost, compilationTargets, options, bazelOpts,
        transforms);
  } else {
    diagnostics = emitWithTypescript(program, compilationTargets, transforms);
  }

  if (diagnostics.length > 0) {
    console.error(bazelDiagnostics.format(bazelOpts.target, diagnostics));
    debug('compilation failed at', new Error().stack!);
    return false;
  }

  cache.printStats();
  return true;
}

function emitWithTypescript(
    program: ts.Program, compilationTargets: ts.SourceFile[],
    transforms: ts.CustomTransformers): ts.Diagnostic[] {
  const diagnostics: ts.Diagnostic[] = [];
  for (const sf of compilationTargets) {
    const result = program.emit(
        sf, /*writeFile*/ undefined,
        /*cancellationToken*/ undefined, /*emitOnlyDtsFiles*/ undefined,
        transforms);
    diagnostics.push(...result.diagnostics);
  }
  return diagnostics;
}

/**
 * Runs the emit pipeline with Tsickle transformations - goog.module rewriting
 * and Closure types emitted included.
 * Exported to be used by the internal global refactoring tools.
 * TODO(radokirov): investigate using runWithOptions and making this private
 * again, if we can make compilerHosts match.
 */
export function emitWithTsickle(
    program: ts.Program, compilerHost: CompilerHost,
    compilationTargets: ts.SourceFile[], options: ts.CompilerOptions,
    bazelOpts: BazelOptions,
    transforms: ts.CustomTransformers): ts.Diagnostic[] {
  const emitResults: tsickle.EmitResult[] = [];
  const diagnostics: ts.Diagnostic[] = [];
  // The 'tsickle' import above is only used in type positions, so it won't
  // result in a runtime dependency on tsickle.
  // If the user requests the tsickle emit, then we dynamically require it
  // here for use at runtime.
  let optTsickle: typeof tsickle;
  try {
    // tslint:disable-next-line:no-require-imports
    optTsickle = require('tsickle');
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
    throw new Error(
        'When setting bazelOpts { tsickle: true }, ' +
        'you must also add a devDependency on the tsickle npm package');
  }
  perfTrace.wrap('emit', () => {
    for (const sf of compilationTargets) {
      perfTrace.wrap(`emit ${sf.fileName}`, () => {
        emitResults.push(optTsickle.emitWithTsickle(
            program, compilerHost, compilerHost, options, sf,
            /*writeFile*/ undefined,
            /*cancellationToken*/ undefined, /*emitOnlyDtsFiles*/ undefined, {
              beforeTs: transforms.before,
              afterTs: transforms.after,
              afterDeclarations: transforms.afterDeclarations,
            }));
      });
    }
  });
  const emitResult = optTsickle.mergeEmitResults(emitResults);
  diagnostics.push(...emitResult.diagnostics);

  // If tsickle reported diagnostics, don't produce externs or manifest outputs.
  if (diagnostics.length > 0) {
    return diagnostics;
  }

  let externs = '/** @externs */\n' +
      '// generating externs was disabled using generate_externs=False\n';
  if (bazelOpts.tsickleGenerateExterns) {
    externs =
        optTsickle.getGeneratedExterns(emitResult.externs, options.rootDir!);
  }

  if (bazelOpts.tsickleExternsPath) {
    // Note: when tsickleExternsPath is provided, we always write a file as a
    // marker that compilation succeeded, even if it's empty (just containing an
    // @externs).
    fs.writeFileSync(bazelOpts.tsickleExternsPath, externs);

    // When generating externs, generate an externs file for each of the input
    // .d.ts files.
    if (bazelOpts.tsickleGenerateExterns &&
        compilerHost.provideExternalModuleDtsNamespace) {
      for (const extern of compilationTargets) {
        if (!extern.isDeclarationFile) continue;
        const outputBaseDir = options.outDir!;
        const relativeOutputPath =
            compilerHost.relativeOutputPath(extern.fileName);
        mkdirp(outputBaseDir, path.dirname(relativeOutputPath));
        const outputPath = path.join(outputBaseDir, relativeOutputPath);
        const moduleName = compilerHost.pathToModuleName('', extern.fileName);
        fs.writeFileSync(
            outputPath,
            `goog.module('${moduleName}');\n` +
                `// Export an empty object of unknown type to allow imports.\n` +
                `// TODO: use typeof once available\n` +
                `exports = /** @type {?} */ ({});\n`);
      }
    }
  }

  if (bazelOpts.manifest) {
    perfTrace.wrap('manifest', () => {
      const manifest =
          constructManifest(emitResult.modulesManifest, compilerHost);
      fs.writeFileSync(bazelOpts.manifest, manifest);
    });
  }

  return diagnostics;
}

/**
 * Creates directories subdir (a slash separated relative path) starting from
 * base.
 */
function mkdirp(base: string, subdir: string) {
  const steps = subdir.split(path.sep);
  let current = base;
  for (let i = 0; i < steps.length; i++) {
    current = path.join(current, steps[i]);
    if (!fs.existsSync(current)) fs.mkdirSync(current);
  }
}


/**
 * Resolve module filenames for JS modules.
 *
 * JS module resolution needs to be different because when transpiling JS we
 * do not pass in any dependencies, so the TS module resolver will not resolve
 * any files.
 *
 * Fortunately, JS module resolution is very simple. The imported module name
 * must either a relative path, or the workspace root (i.e. 'google3'),
 * so we can perform module resolution entirely based on file names, without
 * looking at the filesystem.
 */
function makeJsModuleResolver(workspaceName: string) {
  // The literal '/' here is cross-platform safe because it's matching on
  // import specifiers, not file names.
  const workspaceModuleSpecifierPrefix = `${workspaceName}/`;
  const workspaceDir = `${path.sep}${workspaceName}${path.sep}`;
  function jsModuleResolver(
      moduleName: string, containingFile: string,
      compilerOptions: ts.CompilerOptions, host: ts.ModuleResolutionHost):
      ts.ResolvedModuleWithFailedLookupLocations {
    let resolvedFileName;
    if (containingFile === '') {
      // In tsickle we resolve the filename against '' to get the goog module
      // name of a sourcefile.
      resolvedFileName = moduleName;
    } else if (moduleName.startsWith(workspaceModuleSpecifierPrefix)) {
      // Given a workspace name of 'foo', we want to resolve import specifiers
      // like: 'foo/project/file.js' to the absolute filesystem path of
      // project/file.js within the workspace.
      const workspaceDirLocation = containingFile.indexOf(workspaceDir);
      if (workspaceDirLocation < 0) {
        return {resolvedModule: undefined};
      }
      const absolutePathToWorkspaceDir =
          containingFile.slice(0, workspaceDirLocation);
      resolvedFileName = path.join(absolutePathToWorkspaceDir, moduleName);
    } else {
      if (!moduleName.startsWith('./') && !moduleName.startsWith('../')) {
        throw new Error(
            `Unsupported module import specifier: ${
                JSON.stringify(moduleName)}.\n` +
            `JS module imports must either be relative paths ` +
            `(beginning with '.' or '..'), ` +
            `or they must begin with '${workspaceName}/'.`);
      }
      resolvedFileName = path.join(path.dirname(containingFile), moduleName);
    }
    return {
      resolvedModule: {
        resolvedFileName,
        extension: ts.Extension.Js,  // js can only import js
        // These two fields are cargo culted from what ts.resolveModuleName
        // seems to return.
        packageId: undefined,
        isExternalLibraryImport: false,
      }
    };
  }

  return jsModuleResolver;
}


if (require.main === module) {
  // Do not call process.exit(), as that terminates the binary before
  // completing pending operations, such as writing to stdout or emitting the
  // v8 performance log. Rather, set the exit code and fall off the main
  // thread, which will cause node to terminate cleanly.
  process.exitCode = main(process.argv.slice(2));
}
