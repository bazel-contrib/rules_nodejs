/**
 * @fileoverview wrapper program around the TypeScript compiler, tsc
 *
 * It intercepts the Bazel Persistent Worker protocol, using it to
 * remote-control tsc running in watch mode. It tells the compiler process to
 * consolidate file changes only when it receives a request from the worker
 * protocol.
 *
 * See https://medium.com/@mmorearty/how-to-create-a-persistent-worker-for-bazel-7738bba2cabb
 * for more background on the worker protocol.
 */
import * as fs from 'fs';
import * as webpack from 'webpack';

const MNEMONIC = 'TsProject';
const worker = require('./worker');

let cachedWebpackConfigRequirePath: string|undefined;
let cachedCompiler: webpack.Compiler|undefined;

function getCompiler(args: string[]): webpack.Compiler {
  if (args.length !== 1) {
    throw new Error('worker args must be only the require path to the webpack config');
  }
  const webpackConfigRequirePath = args[0];

  if (cachedCompiler && cachedWebpackConfigRequirePath &&
      cachedWebpackConfigRequirePath !== webpackConfigRequirePath) {
    cachedCompiler.close(() => {});
    cachedCompiler = undefined;
    cachedWebpackConfigRequirePath = undefined;
  }

  if (!cachedCompiler) {
    // TODO: Use https://github.com/webpack/webpack-cli/blob/f7ec953a9c73430cce565707080b0ed2695f217d/packages/webpack-cli/lib/utils/arg-parser.js to parse command line args rather requiring the config
    cachedWebpackConfigRequirePath = webpackConfigRequirePath;
    cachedCompiler = webpack(require(webpackConfigRequirePath));
  }

  return cachedCompiler;
}

function emitOnce(args: string[]): Promise<Boolean> {
  const compiler = getCompiler(args);

  return new Promise((res) => {
    compiler.run((err, stats) => {
      res(Boolean(!err && stats && stats.compilation && !stats.compilation.bail));
    });
  });
}

function main() {
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
    emitOnce(args);
    cachedCompiler?.close(() => {});
  }
}

if (require.main === module) {
  main();
}
