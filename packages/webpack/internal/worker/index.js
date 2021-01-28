/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const webpack = require("webpack");
const MNEMONIC = 'TsProject';
const worker = require('./worker');
let cachedWebpackConfigRequirePath;
let cachedCompiler;
function getCompiler(args) {
    if (args.length !== 1) {
        throw new Error('worker args must be only the require path to the webpack config');
    }
    const webpackConfigRequirePath = args[0];
    if (cachedCompiler && cachedWebpackConfigRequirePath &&
        cachedWebpackConfigRequirePath !== webpackConfigRequirePath) {
        cachedCompiler.close(() => { });
        cachedCompiler = undefined;
        cachedWebpackConfigRequirePath = undefined;
    }
    if (!cachedCompiler) {
        cachedWebpackConfigRequirePath = webpackConfigRequirePath;
        cachedCompiler = webpack(require(webpackConfigRequirePath));
    }
    return cachedCompiler;
}
function emitOnce(args) {
    const compiler = getCompiler(args);
    return new Promise((res) => {
        compiler.run((err, stats) => {
            res(Boolean(!err && stats && stats.compilation && !stats.compilation.bail));
        });
    });
}
function main() {
    var _a;
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
        emitOnce(args);
        (_a = cachedCompiler) === null || _a === void 0 ? void 0 : _a.close(() => { });
    }
}
if (require.main === module) {
    main();
}
