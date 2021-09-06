/**
 * @fileoverview wrapper program around the Webpack CLI.
 *
 * It intercepts the Bazel Persistent Worker protocol, using it to
 * remote-control webpack cli. It tells the compiler process to
 * consolidate file changes only when it receives a request from the worker
 * protocol.
 *
 * See https://medium.com/@mmorearty/how-to-create-a-persistent-worker-for-bazel-7738bba2cabb
 * for more background on the worker protocol.
 */
import * as cp from 'child_process';
import * as fs from 'fs';


const MNEMONIC = 'webpack';
const worker = require('./worker');

let webpackCLIProcess: {
  childProcess: cp.ChildProcess,
  key: string,
}|undefined;

function getWebpackCLIProcess(webpackCLIArgs: string[]) {
  const key = webpackCLIArgs.join('-');
  if (!webpackCLIProcess || webpackCLIProcess.key !== key) {
    webpackCLIProcess?.childProcess.kill();

    webpackCLIProcess = {
      childProcess: cp.fork(require.resolve('webpack-cli/bin/cli.js'), webpackCLIArgs, {stdio: 'inherit'}),
      key,
    }
  }

  return webpackCLIProcess;
}

function emitOnce(webpackCLIArgs: string[]) {
  const webpackCLIProcess =
      getWebpackCLIProcess(webpackCLIArgs);

  // TODO: Establish a means of communication between this process and the bazel webpack plugin. It
  // can communicate to us via STDOUT, but we need to communicate to it (probably via STDIN like how
  // ibazel does. This would give us the same communication layer to use in worker mode during bazel
  // build as we would use during an ibazel run).

  // if (!webpackCLIProcess || !webpackCLIProcess.childProcess.stdout) {
  //   throw new Error('webpack cli spawned without stdout')
  // }

  return new Promise(resolve => {
          //  webpackCLIProcess!.childProcess!.stdout!.on('data', (chunk: any) => {
          //    if (chunk.includes('WEBPACK_BAZEL_PLUGIN_COMPILATION_FINISHED')) {
          //      return resolve(true);
          //    }

          //    if (chunk.includes('WEBPACK_BAZEL_PLUGIN_COMPILATION_FAILED')) {
          //      resolve(false)
          //    }
          //  });
           webpackCLIProcess!.childProcess.on('close', (code: number) => {
             resolve(code === 0);
           })
         })
      .finally(() => {
        // webpackCLIProcess!.childProcess.removeAllListeners();
        // webpackCLIProcess!.childProcess!.stdout!.removeAllListeners();
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

    let argsFilePath = process.argv.pop();
    if (!argsFilePath) {
      throw new Error('Invalid arguments. First argument must be argsFilePath or worker protocol');
    }
    if (argsFilePath!.startsWith('@')) {
      argsFilePath = argsFilePath!.slice(1)
    }
    const args = fs.readFileSync(argsFilePath!).toString().split('\n');

    emitOnce(args).finally(() => webpackCLIProcess?.childProcess.kill());
  }
}

if (require.main === module) {
  main();
}