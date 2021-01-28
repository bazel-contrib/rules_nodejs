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
const cp = require("child_process");
const fs = require("fs");
const MNEMONIC = 'Webpack';
const worker = require('./worker');
let webpackCLIProcess;
function getWebpackCLIProcess(webpackCliLocation, presetWebpackPluginConfig, userWebpackConfig, extraUserArguments) {
    if (!webpackCLIProcess) {
        let webpackCmd = `${webpackCliLocation} --config ${presetWebpackPluginConfig}}`;
        if (userWebpackConfig) {
            webpackCmd = `${webpackCmd} --config ${userWebpackConfig} --merge`;
        }
        if (extraUserArguments) {
            webpackCmd = `${webpackCmd} ${extraUserArguments.join(' ')}`;
        }
        webpackCLIProcess = cp.exec(webpackCmd);
    }
    return webpackCLIProcess;
}
function emitOnce(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const watchProgram = getWebpackCLIProcess(args[0], args[1], args[2], args.slice(3));
        if (!watchProgram.stdout) {
            throw new Error('Watch program was not spawned with stdout');
        }
        watchProgram.stdout.on('data', (data) => {
            if (data.includes('WEBPACK_BAZEL_PLUGIN_COMPILATION_FINISHED')) {
                console.log('Webpack compilation succeeded');
                return true;
            }
            if (data.includes('WEBPACK_BAZEL_PLUGIN_COMPILATION_FAILED')) {
                throw new Error('Webpack compilation has failed');
            }
        });
        return Boolean(false);
    });
}
function main() {
    if (process.argv.includes('--persistent_worker')) {
        worker.log(`Running ${MNEMONIC} as a Bazel worker`);
        worker.runWorkerLoop(emitOnce);
    }
    else {
        worker.log(`Running ${MNEMONIC} as a standalone process`);
        worker.log(`Started a new process to perform this action. Your build might be misconfigured, try	
       --strategy=${MNEMONIC}=worker`);
        let argsFilePath = process.argv.pop();
        if (!argsFilePath) {
            throw new Error('Invalid arguments. First argument must be argsFilePath or worker protocol');
        }
        if (argsFilePath.startsWith('@')) {
            argsFilePath = argsFilePath.slice(1);
        }
        const args = fs.readFileSync(argsFilePath).toString().split('\n');
        emitOnce(args).finally(() => webpackCLIProcess === null || webpackCLIProcess === void 0 ? void 0 : webpackCLIProcess.kill());
    }
}
if (require.main === module) {
    main();
}
