/**
 * @fileoverview wrapper program around the TypeScript compiler, tsc
 *
 * It intercepts the Bazel Persistent Worker protocol, using it to remote-control tsc running as a
 * child process. In between builds, the tsc process is stopped (akin to ctrl-z in a shell) and then
 * resumed (akin to `fg`) when the inputs have changed.
 *
 * See https://medium.com/@mmorearty/how-to-create-a-persistent-worker-for-bazel-7738bba2cabb
 * for more background (note, that is documenting a different implementation)
 */
const child_process = require('child_process');
const MNEMONIC = 'TsProject';
const worker = require('./worker');

const workerArg = process.argv.indexOf('--persistent_worker')
if (workerArg > 0) {
  process.argv.splice(workerArg, 1, '--watch')

  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    throw new Error(`Worker mode is only supported on linux and darwin, not ${process.platform}.
        See https://github.com/bazelbuild/rules_nodejs/issues/2277`);
  }
}

const [tscBin, ...tscArgs] = process.argv.slice(2);

const child = child_process.spawn(
    tscBin,
    tscArgs,
    {stdio: 'pipe'},
);
function awaitOneBuild() {
  child.kill('SIGCONT')

  let buffer = [];
  return new Promise((res) => {
    function awaitBuild(s) {
      buffer.push(s);

      if (s.includes('Watching for file changes.')) {
        child.kill('SIGSTOP')

        const success = s.includes('Found 0 errors.');
        res(success);

        child.stdout.removeListener('data', awaitBuild);

        if (!success) {
          console.error(
              `\nError output from tsc worker:\n\n  ${
                  buffer.slice(1).map(s => s.toString()).join('').replace(/\n/g, '\n  ')}`,
          )
        }

        buffer = [];
      }
    };
    child.stdout.on('data', awaitBuild);
  });
}

async function main() {
  // Bazel will pass a special argument to the program when it's running us as a worker
  if (workerArg > 0) {
    worker.log(`Running ${MNEMONIC} as a Bazel worker`);

    worker.runWorkerLoop(awaitOneBuild);
  } else {
    // Running standalone so stdout is available as usual
    console.log(`Running ${MNEMONIC} as a standalone process`);
    console.error(
        `Started a new process to perform this action. Your build might be misconfigured, try
      --strategy=${MNEMONIC}=worker`);

    const stdoutbuffer = [];
    child.stdout.on('data', data => stdoutbuffer.push(data));

    const stderrbuffer = [];
    child.stderr.on('data', data => stderrbuffer.push(data));

    child.on('exit', code => {
      if (code !== 0) {
        console.error(
            `\nstdout from tsc:\n\n  ${
                stdoutbuffer.map(s => s.toString()).join('').replace(/\n/g, '\n  ')}`,
        )
        console.error(
            `\nstderr from tsc:\n\n  ${
                stderrbuffer.map(s => s.toString()).join('').replace(/\n/g, '\n  ')}`,
        )
      }
      process.exit(code)
    });
  }
}

if (require.main === module) {
  main();
}
