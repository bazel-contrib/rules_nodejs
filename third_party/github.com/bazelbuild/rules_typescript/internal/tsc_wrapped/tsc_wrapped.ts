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
import {DiagnosticPlugin, PluginCompilerHost, EmitPlugin} from './plugin_api';
import {Plugin as StrictDepsPlugin} from './strict_deps';
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
    disabledTsetseRules: string[],
    plugins: DiagnosticPlugin[] = []): ts.Diagnostic[] {

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

    // Install extra diagnostic plugins
    plugins.push(
        ...getCommonPlugins(options, bazelOpts, program, disabledTsetseRules));
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
export function getCommonPlugins(
    options: ts.CompilerOptions, bazelOpts: BazelOptions, program: ts.Program,
    disabledTsetseRules: string[]): DiagnosticPlugin[] {
  const plugins: DiagnosticPlugin[] = [];
  if (!bazelOpts.disableStrictDeps) {
    if (options.rootDir == null) {
      throw new Error(`StrictDepsPlugin requires that rootDir be specified`);
    }
    plugins.push(new StrictDepsPlugin(program, {
      ...bazelOpts,
      rootDir: options.rootDir,
    }));
  }
  if (!bazelOpts.isJsTranspilation) {
    let tsetsePluginConstructor:
        {new (program: ts.Program, disabledRules: string[]): DiagnosticPlugin} =
            BazelConformancePlugin;
    plugins.push(new tsetsePluginConstructor(program, disabledTsetseRules));
  }
  return plugins;
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
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') ||
      filePath.endsWith('.js')) {
    fileList.push(filePath);
    return;
  }

  if (!fs.statSync(filePath).isDirectory()) {
    // subdirectories may also contain e.g. .java files, which we ignore.
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
  const {options, bazelOpts, files, disabledTsetseRules} = parsed;

  let sourceFiles: string[] = [];
  if (bazelOpts.isJsTranspilation) {
    // Under JS transpilations, some inputs might be directories.
    for (const filePath of files) {
      expandSourcesFromDirectories(sourceFiles, filePath);
    }
  } else {
    sourceFiles = files;
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

  const diagnostics = perfTrace.wrap('createProgramAndEmit', () => {
    return createProgramAndEmit(
               fileLoader, options, bazelOpts, sourceFiles, disabledTsetseRules)
        .diagnostics;
  });

  if (diagnostics.length > 0) {
    console.error(bazelDiagnostics.format(bazelOpts.target, diagnostics));
    return false;
  }

  const perfTracePath = bazelOpts.perfTracePath;
  if (perfTracePath) {
    log('Writing trace to', perfTracePath);
    perfTrace.snapshotMemoryUsage();
    perfTrace.write(perfTracePath);
  }

  return true;
}

// We use the expected_diagnostics attribute for writing compilation tests.
// We don't want to expose it to users as a general-purpose feature, because
// we don't want users to end up using it like a fancy @ts-ignore.
// So instead it's limited to a whitelist.
const expectDiagnosticsWhitelist: string[] = [
];

/** errorDiag produces an error diagnostic not bound to a file or location. */
function errorDiag(messageText: string) {
  return {
    category: ts.DiagnosticCategory.Error,
    code: 0,
    file: undefined,
    start: undefined,
    length: undefined,
    messageText,
  };
}

/**
 * createProgramAndEmit creates a ts.Program from the given options and emits it
 * according to them (e.g. including running various plugins and tsickle). It
 * returns the program and any diagnostics generated.
 *
 * Callers should check and emit diagnostics.
 */
export function createProgramAndEmit(
    fileLoader: FileLoader, options: ts.CompilerOptions,
    bazelOpts: BazelOptions, files: string[], disabledTsetseRules: string[]):
    {program?: ts.Program, diagnostics: ts.Diagnostic[]} {
  // Beware! createProgramAndEmit must not print to console, nor exit etc.
  // Handle errors by reporting and returning diagnostics.
  perfTrace.snapshotMemoryUsage();
  cache.resetStats();
  cache.traceStats();

  const compilerHostDelegate =
      ts.createCompilerHost({target: ts.ScriptTarget.ES5});

  const moduleResolver = bazelOpts.isJsTranspilation ?
      makeJsModuleResolver(bazelOpts.workspaceName) :
      ts.resolveModuleName;

  // Files which should be allowed to be read, but aren't TypeScript code
  const assets: string[] = [];
  if (bazelOpts.angularCompilerOptions) {
    if (bazelOpts.angularCompilerOptions.assets) {
      assets.push(...bazelOpts.angularCompilerOptions.assets);
    }
  }

  const tsickleCompilerHost = new CompilerHost(
      [...files, ...assets], options, bazelOpts, compilerHostDelegate, fileLoader,
      moduleResolver);
  let compilerHost: PluginCompilerHost = tsickleCompilerHost;
  const diagnosticPlugins: DiagnosticPlugin[] = [];

  let angularPlugin: EmitPlugin&DiagnosticPlugin|undefined;
  if (bazelOpts.angularCompilerOptions) {
    try {
      const ngOptions = bazelOpts.angularCompilerOptions;
      // Add the rootDir setting to the options passed to NgTscPlugin.
      // Required so that synthetic files added to the rootFiles in the program
      // can be given absolute paths, just as we do in tsconfig.ts, matching
      // the behavior in TypeScript's tsconfig parsing logic.
      ngOptions['rootDir'] = options.rootDir;

      let angularPluginEntryPoint = '@angular/compiler-cli';

      // Dynamically load the Angular compiler.
      // Lazy load, so that code that does not use the plugin doesn't even
      // have to spend the time to parse and load the plugin's source.
      //
      // tslint:disable-next-line:no-require-imports
      const ngtsc = require(angularPluginEntryPoint);
      angularPlugin = new ngtsc.NgTscPlugin(ngOptions);
      diagnosticPlugins.push(angularPlugin!);
    } catch (e) {
      return {
        diagnostics: [errorDiag(
            'when using `ts_library(use_angular_plugin=True)`, ' +
            `you must install @angular/compiler-cli (was: ${e})`)]
      };
    }

    // Wrap host so that Ivy compiler can add a file to it (has synthetic types for checking templates)
    // TODO(arick): remove after ngsummary and ngfactory files eliminated
    compilerHost = angularPlugin!.wrapHost!(compilerHost, files, options);
  }


  const oldProgram = cache.getProgram(bazelOpts.target);
  const program = perfTrace.wrap(
      'createProgram',
      () => ts.createProgram(
          compilerHost.inputFiles, options, compilerHost, oldProgram));
  cache.putProgram(bazelOpts.target, program);

  let transformers: ts.CustomTransformers = {
    before: [],
    after: [],
    afterDeclarations: [],
  };
  if (angularPlugin) {
    angularPlugin.setupCompilation(program);
    transformers = angularPlugin.createTransformers();
  }

  for (const pluginConfig of options['plugins'] as ts.PluginImport[] || []) {
    if (pluginConfig.name === 'ts-lit-plugin') {
      const litTscPlugin =
          // Lazy load, so that code that does not use the plugin doesn't even
          // have to spend the time to parse and load the plugin's source.
          //
          // tslint:disable-next-line:no-require-imports
          new (require('ts-lit-plugin/lib/bazel-plugin').Plugin)(
              program, pluginConfig) as DiagnosticPlugin;
      diagnosticPlugins.push(litTscPlugin);
    }
  }

  if (!bazelOpts.isJsTranspilation) {
    // If there are any TypeScript type errors abort now, so the error
    // messages refer to the original source.  After any subsequent passes
    // (decorator downleveling or tsickle) we do not type check.
    let diagnostics = gatherDiagnostics(
        options, bazelOpts, program, disabledTsetseRules, diagnosticPlugins);
    if (!expectDiagnosticsWhitelist.length ||
        expectDiagnosticsWhitelist.some(p => bazelOpts.target.startsWith(p))) {
      diagnostics = bazelDiagnostics.filterExpected(
          bazelOpts, diagnostics, bazelDiagnostics.uglyFormat);
    } else if (bazelOpts.expectedDiagnostics.length > 0) {
      diagnostics.push(errorDiag(
          `Only targets under ${
              expectDiagnosticsWhitelist.join(', ')} can use ` +
          'expected_diagnostics, but got ' + bazelOpts.target));
    }

    // The Angular plugin creates a new program with template type-check information
    // This consumes (destroys) the old program so it's not suitable for re-use anymore
    // Ask Angular to give us the updated reusable program.
    if (angularPlugin) {
      cache.putProgram(bazelOpts.target, angularPlugin.getNextProgram!());
    }

    if (diagnostics.length > 0) {
      debug('compilation failed at', new Error().stack!);
      return {program, diagnostics};
    }
  }

  // Angular might have added files like input.ngfactory.ts or input.ngsummary.ts
  // and these need to be emitted.
  // TODO(arick): remove after Ivy is enabled and ngsummary/ngfactory files no longer needed
  function isAngularFile(sf: ts.SourceFile) {
    if (!/\.ng(factory|summary)\.ts$/.test(sf.fileName)) {
      return false;
    }
    return isCompilationTarget(bazelOpts, {
      fileName: sf.fileName.slice(0, /*'.ngfactory|ngsummary.ts'.length*/ -13) + '.ts'
    } as ts.SourceFile);
  }

  const compilationTargets = program.getSourceFiles().filter(
      sf => isCompilationTarget(bazelOpts, sf) || isAngularFile(sf));

  let diagnostics: ts.Diagnostic[] = [];
  let useTsickleEmit = bazelOpts.tsickle;

  if (useTsickleEmit) {
    diagnostics = emitWithTsickle(
        program, tsickleCompilerHost, compilationTargets, options, bazelOpts,
        transformers);
  } else {
    diagnostics = emitWithTypescript(program, compilationTargets, transformers);
  }

  if (diagnostics.length > 0) {
    debug('compilation failed at', new Error().stack!);
  }
  cache.printStats();
  return {program, diagnostics};
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

  if (!options.noEmit && bazelOpts.tsickleExternsPath) {
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

  if (!options.noEmit && bazelOpts.manifest) {
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
