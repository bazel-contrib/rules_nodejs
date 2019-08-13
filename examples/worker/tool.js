/**
 * @fileoverview this program does a trivial job of writing a dummy string to an output
 */
const worker = require('@bazel/worker');

function runOneBuild(args, inputs) {
  // IMPORTANT don't log with console.out - stdout is reserved for the worker protocol.
  // This is true for any code running in the program, even if it comes from a third-party library.
  worker.log('Performing a build with args', args);
  if (inputs) {
    // The inputs help you manage a cache within the worker process
    // They are available only when run as a worker, not in standalone mode
    worker.log('We were run as a worker so we also got a manifest of all the inputs', inputs);
  }

  // Parse our arguments as usual. The worker library handles getting these out of the protocol
  // buffer.
  const [output] = args;
  require('fs').writeFileSync(output, 'Dummy output', {encoding: 'utf-8'});

  // Return true if the tool succeeded, false otherwise.
  return true;
}

if (require.main === module) {
  // One reason to run a program under a worker is that it takes a long time to start
  // Imagine that several seconds are spent here

  // Bazel will pass a special argument to the program when it's running us as a worker
  if (worker.runAsWorker(process.argv)) {
    worker.log('Running as a Bazel worker');

    worker.runWorkerLoop(runOneBuild);
  } else {
    // Running standalone so stdout is available as usual
    console.log('Running as a standalone process');

    // Help our users get on the fast path
    console.error(
        'Started a new process to perform this action. Your build might be misconfigured, try --strategy=DoWork=worker');

    // The first argument to the program is prefixed with '@'
    // because Bazel does that for param files. Strip it first.
    const paramFile = process.argv[2].replace(/^@/, '');
    const args = require('fs').readFileSync(paramFile, 'utf-8').trim().split('\n');

    // Bazel is just running the program as a single action, don't act like a worker
    if (!runOneBuild(args)) {
      process.exitCode = 1;
    }
  }
}
