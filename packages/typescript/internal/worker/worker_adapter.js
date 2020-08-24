const child_process = require('child_process');

const worker = require('./worker');

const workerArg = process.argv.indexOf('--persistent_worker')
if (workerArg > 0) {
  process.argv.splice(workerArg, 1)

  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    throw new Error('Worker mode is only supported on unix type systems.');
  }

  worker.runWorkerLoop(awaitOneBuild);
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