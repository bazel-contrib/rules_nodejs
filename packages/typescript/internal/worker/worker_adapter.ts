/**
 * @fileoverview wrapper program around the TypeScript Watcher Compiler Host.
 *
 * It intercepts the Bazel Persistent Worker protocol, using it to
 * remote-control compiler host. It tells the compiler process to
 * consolidate file changes only when it receives a request from the worker
 * protocol.
 *
 * See https://medium.com/@mmorearty/how-to-create-a-persistent-worker-for-bazel-7738bba2cabb
 * for more background on the worker protocol.
 */
import * as fs from 'fs';
import * as ts from 'typescript';
import * as worker from '@bazel/worker';

const MNEMONIC = 'TsProject';

let createWatchCompilerHost: typeof ts.createWatchCompilerHost;

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (path) => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

/**
 * Prints a diagnostic result for every compiler error or warning.
 */
const reportDiagnostic: ts.DiagnosticReporter = (diagnostic) => {
  worker.log(ts.formatDiagnostic(diagnostic, formatHost));
};

/**
 * Prints a diagnostic every time the watch status changes.
 * This is mainly for messages like "Starting compilation" or "Compilation completed".
 */
const reportWatchStatusChanged: ts.WatchStatusReporter = (diagnostic) => {
  worker.debug(ts.formatDiagnostic(diagnostic, formatHost));
};

function createWatchProgram(
    options: ts.CompilerOptions, tsconfigPath: string, setTimeout: ts.System['setTimeout']) {
  const host = createWatchCompilerHost(
      tsconfigPath, options, {...ts.sys, setTimeout},
      ts.createSemanticDiagnosticsBuilderProgram, reportDiagnostic,
      reportWatchStatusChanged);

  // `createWatchProgram` creates an initial program, watches files, and updates
  // the program over time.
  return ts.createWatchProgram(host);
}

/**
 * Timestamp of the last worker request.
 */
let workerRequestTimestamp: number|undefined;
/**
 * The typescript compiler in watch mode.
 */
let cachedWatchedProgram:|ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>|
    undefined;
/**
 * Callback provided by ts.System which should be called at the point at which
 * file system changes should be consolidated into a new emission from the
 * watcher.
 */
let consolidateChangesCallback: ((...args: any[]) => void)|undefined;
let cachedWatchProgramArgs: string|undefined;

function getWatchProgram(args: string[]):
    ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram> {
  const newWatchArgs = args.join(' ');

  // Check to see if the watch program needs to be updated or if we can re-use the old one.
  if (cachedWatchedProgram && cachedWatchProgramArgs && cachedWatchProgramArgs !== newWatchArgs) {
    cachedWatchedProgram.close();
    cachedWatchedProgram = undefined;
    cachedWatchProgramArgs = undefined;
  }

  // If we have not yet created a watch
  if (!cachedWatchedProgram) {
    const parsedArgs = ts.parseCommandLine(args);
    const tsconfigPath = args[args.indexOf('--project') + 1];

    cachedWatchProgramArgs = newWatchArgs;
    cachedWatchedProgram = createWatchProgram(parsedArgs.options, tsconfigPath, (callback) => {
      consolidateChangesCallback = callback;
    });
  }

  return cachedWatchedProgram;
}

async function emitOnce(args: string[]) {
  const watchProgram = getWatchProgram(args);

  if (consolidateChangesCallback) {
    consolidateChangesCallback();
  }

  workerRequestTimestamp = Date.now();
  const program = watchProgram?.getProgram()
  const cancellationToken: ts.CancellationToken = {
    isCancellationRequested: function(timestamp: number) {
      return timestamp !== workerRequestTimestamp;
    }.bind(null, workerRequestTimestamp),
    throwIfCancellationRequested: function(timestamp: number) {
      if (timestamp !== workerRequestTimestamp) {
        throw new ts.OperationCanceledException();
      }
    }.bind(null, workerRequestTimestamp),
  }
 
  const result = program.emit(undefined, undefined, cancellationToken);
  const diagnostics = ts.getPreEmitDiagnostics(program as unknown as ts.Program, undefined,  cancellationToken)
  let succeded = result && result.diagnostics.length === 0 && diagnostics.length == 0
  return succeded
}

function main() {
  const typescriptRequirePath = process.argv[process.argv.indexOf('--typescript_require_path') + 1];
  try {
    const customTypescriptModule = require(typescriptRequirePath);
    createWatchCompilerHost = customTypescriptModule.createWatchCompilerHost;
  } catch (e) {
    worker.log(`typescript_require_path '${typescriptRequirePath}' could not be resolved`)
    throw e;
  }
  if (process.argv.includes('--persistent_worker')) {
    worker.log(`Running ${MNEMONIC} as a Bazel worker`);
    worker.runWorkerLoop(emitOnce);
  } else {
    worker.log(`Running ${MNEMONIC} as a standalone process`);
    worker.log(
        `Started a new process to perform this action. Your build might be misconfigured, try	
      --strategy=${MNEMONIC}=worker`);

    let argsFilePath = process.argv.pop()!;
    if (argsFilePath.startsWith('@')) {
      argsFilePath = argsFilePath.slice(1)
    }
    const args = fs.readFileSync(argsFilePath).toString().split('\n');
    emitOnce(args).finally(() => cachedWatchedProgram?.close());
  }
}

if (require.main === module) {
  main();
}
