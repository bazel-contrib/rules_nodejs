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


const MNEMONIC = 'Webpack';
const worker = require('./worker');

/**
 * Timestamp of the last worker request.
 */
let webpackCLIProcess: cp.ChildProcess|undefined;

function getWebpackCLIProcess(
    webpackCliLocation: string, presetWebpackPluginConfig: string, userWebpackConfig: string,
    extraUserArguments: string[]) {
  if (!webpackCLIProcess) {
    let webpackCmd = `${webpackCliLocation} --config ${presetWebpackPluginConfig}}`

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

async function emitOnce(args: string[]) {
  const watchProgram = getWebpackCLIProcess(args[0], args[1], args[2], args.slice(3))

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

  // TODO: Establish a means of communication between this process and the bazel webpack plugin. It
  // can communicate to us via STDOUT, but we need to communicate to it (probably via STDIN like how
  // ibazel does. This would give us the same communication layer to use in worker mode during bazel
  // build as we would use during an ibazel run).

  return Boolean(false);
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
    if (argsFilePath.startsWith('@')) {
      argsFilePath = argsFilePath.slice(1)
    }
    const args = fs.readFileSync(argsFilePath).toString().split('\n');
         emitOnce(args).finally(() => webpackCLIProcess?.kill());
  }
}

if (require.main === module) {
  main();
}