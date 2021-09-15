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
import * as worker from "@bazel/worker";
import * as cp from 'child_process';
import * as fs from 'fs';

const webpackCli = require("webpack-cli");

type IPCMessage = {
  type: "built" | "error" | "ready"
}

function main() {
  const MNEMONIC = 'webpack';
  if (worker.runAsWorker(process.argv)) {
    const webpackCliPath = require.resolve("webpack-cli/bin/cli.js");
    let key: string;
    let proc: cp.ChildProcess | undefined;

    worker.runWorkerLoop(async (args: string[], inputs: { [path: string]: string }) => {
      return new Promise<boolean>((resolve, reject) => {
        // We can not add --watch argument earlier in the starlark side 
        // until we know for sure which mode we are working on. in RBE 
        // local execution strategy will be the default and we have 
        // no choice but to add it dynamically on runtime. 
        args = [...args,  "--watch"];

        const argumentKey = args.join("#");

        if (key != argumentKey && proc) {
          proc.kill("SIGKILL");
          proc = undefined;
        }

        if (!proc) {
          proc = cp.fork(webpackCliPath, args, { stdio: "pipe" });
          proc.stderr!.pipe(process.stderr);
          proc.stdout!.pipe(process.stderr);
          key = argumentKey;
        } else {
          proc.send(inputs);
        }

        const gotMessage = (message: IPCMessage) => {
          switch (message.type) {
            case "ready":
              proc!.send(inputs);
              break;
            case "built":
              resolve(true);
              proc!.off("message", gotMessage);
              break;
            case "error":
              resolve(false);
              proc!.off("message", gotMessage);
              break;
          }
        }
        const procDied = (err?: Error) => {
          if (err) console.error(err);
          proc = undefined;
          reject();
        }
        proc.once("error", procDied);
        proc.once("exit", procDied);
        proc.on("message", gotMessage);
      });
    })
  } else {
    worker.log(`Running ${MNEMONIC} as a standalone process`);
    worker.log(
      `Started a new process to perform this action. Your build might be misconfigured, try	
       --strategy=${MNEMONIC}=worker`);
    let argsFilePath = process.argv.pop()!;
    if (argsFilePath.startsWith('@')) {
      argsFilePath = argsFilePath.slice(1)
    }
    const args = fs.readFileSync(argsFilePath).toString().trim().split('\n');
    new webpackCli().run([process.argv[0], process.argv[1], ...args]);
  }
}

if (require.main === module) {
  main();
}
