/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const ts = require("typescript");
const MNEMONIC = 'TsProject';
const worker = require('./worker');
let createWatchCompilerHost;
const formatHost = {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
};
const reportDiagnostic = (diagnostic) => {
    worker.log(ts.formatDiagnostic(diagnostic, formatHost));
};
const reportWatchStatusChanged = (diagnostic) => {
    worker.debug(ts.formatDiagnostic(diagnostic, formatHost));
};
function createWatchProgram(options, tsconfigPath, setTimeout) {
    const host = createWatchCompilerHost(tsconfigPath, options, Object.assign(Object.assign({}, ts.sys), { setTimeout }), ts.createEmitAndSemanticDiagnosticsBuilderProgram, reportDiagnostic, reportWatchStatusChanged);
    return ts.createWatchProgram(host);
}
let workerRequestTimestamp;
let cachedWatchedProgram;
let consolidateChangesCallback;
let cachedWatchProgramArgs;
function getWatchProgram(args) {
    const newWatchArgs = args.join(' ');
    if (cachedWatchedProgram && cachedWatchProgramArgs && cachedWatchProgramArgs !== newWatchArgs) {
        cachedWatchedProgram.close();
        cachedWatchedProgram = undefined;
        cachedWatchProgramArgs = undefined;
    }
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
function emitOnce(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const watchProgram = getWatchProgram(args);
        if (consolidateChangesCallback) {
            consolidateChangesCallback();
        }
        workerRequestTimestamp = Date.now();
        const result = yield (watchProgram === null || watchProgram === void 0 ? void 0 : watchProgram.getProgram().emit(undefined, undefined, {
            isCancellationRequested: function (timestamp) {
                return timestamp !== workerRequestTimestamp;
            }.bind(null, workerRequestTimestamp),
            throwIfCancellationRequested: function (timestamp) {
                if (timestamp !== workerRequestTimestamp) {
                    throw new ts.OperationCanceledException();
                }
            }.bind(null, workerRequestTimestamp),
        }));
        return Boolean(result && result.diagnostics.length === 0);
    });
}
function main() {
    const typescriptRequirePath = process.argv[process.argv.indexOf('--typescript_require_path') + 1];
    try {
        const customTypescriptModule = require(typescriptRequirePath);
        createWatchCompilerHost = customTypescriptModule.createWatchCompilerHost;
    }
    catch (e) {
        worker.log(`typescript_require_path '${typescriptRequirePath}' could not be resolved`);
        throw e;
    }
    if (process.argv.includes('--persistent_worker')) {
        worker.log(`Running ${MNEMONIC} as a Bazel worker`);
        worker.runWorkerLoop(emitOnce);
    }
    else {
        worker.log(`Running ${MNEMONIC} as a standalone process`);
        worker.log(`Started a new process to perform this action. Your build might be misconfigured, try	
      --strategy=${MNEMONIC}=worker`);
        let argsFilePath = process.argv.pop();
        if (argsFilePath.startsWith('@')) {
            argsFilePath = argsFilePath.slice(1);
        }
        const args = fs.readFileSync(argsFilePath).toString().split('\n');
        emitOnce(args).finally(() => cachedWatchedProgram === null || cachedWatchedProgram === void 0 ? void 0 : cachedWatchedProgram.close());
    }
}
if (require.main === module) {
    main();
}
