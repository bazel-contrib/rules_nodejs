#!/usr/bin/env node
/**
 * @fileoverview wraps the terser CLI to support minifying a directory
 * Terser doesn't support it; see https://github.com/terser/terser/issues/75
 * TODO: maybe we should generalize this to a package which would be useful outside
 *       bazel; however we would have to support the full terser CLI and not make
 *       assumptions about how the argv looks.
 */
const fs = require('fs');
const path = require('path');
const worker_threads = require('worker_threads');
const os = require('os')

// Run Bazel with --define=VERBOSE_LOGS=1 to enable this logging
const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];

function log_verbose(...m) {
  if (VERBOSE_LOGS) console.log('[terser/index.js]', ...m);
}

function log_error(...m) {
  console.error('[terser/index.js]', ...m);
}

// user override for the terser binary location. used in testing.
const TERSER_BINARY = process.env.TERSER_BINARY || require.resolve('terser/bin/uglifyjs');
// set process.env.TERSER_BINARY for the workers to pick it up again without having to do a
// require.resolve
process.env.TERSER_BINARY = TERSER_BINARY;
// choose a default concurrency of the number of cores -1 but at least 1.
const TERSER_CONCURRENCY = (process.env.TERSER_CONCURRENCY || os.cpus().length - 1) || 1

function isDirectory(input) {
  return fs.lstatSync(path.join(process.cwd(), input)).isDirectory();
}

function terserDirectory(input, output, residual) {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  const work = [];
  const errors = [];
  const avilableWorkers = [];

  for (let i = 0; i < TERSER_CONCURRENCY; i++) {
    // spawn up our persistant workers
    avilableWorkers.push(new worker_threads.Worker(__filename));
  }

  function exec([inputFile, outputFile]) {
    let args = [inputFile, '--output=' + outputFile, ...residual];

    const worker = avilableWorkers.pop();
    // send the worker some work to do!
    worker.once('message', msg => {
      if (!msg.success) {
        // NOTE: Even though a terser process has errored we continue here to collect all of
        // the errors. this behavior is another candidate for user configuration because
        // there is value in stopping at the first error in some use cases.
        errors.push(msg.error)
        log_verbose(`worker [${worker.threadId}] errored: ${inputFile}\nOUT: ${outputFile}\nERR: ${
            msg.error}`);
      } else {
        log_verbose(`worker [${worker.threadId}] finished: `, inputFile);
      }

      // push the worker back on the avilable queue
      avilableWorkers.push(worker);

      next();
    });

    worker.on('error', error => {log_verbose(error)})
    // tell the worker to get to work
    worker.postMessage({
      args,
    });
  }

  function next() {
    if (work.length) {
      exec(work.shift());
    } else if (avilableWorkers.length === TERSER_CONCURRENCY) {
      // if there's no more work to do and all the workers have been returned
      // then we're done, so we check ti see if we got any errors
      if (errors.length) {
        log_error('terser errored processing javascript in directory.')
      }
      log_verbose('done!')
      // NOTE: work is done at this point and node should exit here.
      for (const worker of avilableWorkers) {
        worker.unref()
      }
    }
  }

  fs.readdirSync(input).forEach(f => {
    if (f.endsWith('.js')) {
      // const inputFile = path.resolve(path.join(input, path.basename(f)));
      // const outputFile = path.resolve(path.join(output, path.basename(f)));
      const inputFile = path.join(input, path.basename(f));
      const outputFile = path.join(output, path.basename(f));

      if (avilableWorkers.length > 0) {
        exec([inputFile, outputFile]);
      } else {
        work.push([inputFile, outputFile])
      }
    }
  });
}

/**
 * Assumes that process.argv is already set to the terser args
 */
function runTerserCli() {
  if (worker_threads.isMainThread) {
    log_verbose(`calling terser with args, ${process.argv.join(' ')}`)
  } else {
    log_verbose(
        `worker [${worker_threads.threadId}] - calling terser with args, ${process.argv.join(' ')}`)
  }

  require(TERSER_BINARY);
}
//
function main() {
  // Peek at the arguments to find any directories declared as inputs
  let argv = process.argv.slice(2);
  // terser_minified.bzl always passes the inputs first,
  // then --output [out], then remaining args
  // We want to keep those remaining ones to pass to terser
  // Avoid a dependency on a library like minimist; keep it simple.
  const outputArgIndex = argv.findIndex((arg) => arg.startsWith('--'));

  // We don't want to implement a command-line parser for terser
  // so we invoke its CLI with modified process.argv when a directory is provided, just altering the
  // input/output arguments. See discussion: https://github.com/bazelbuild/rules_nodejs/issues/822

  const inputs = argv.slice(0, outputArgIndex);
  const output = argv[outputArgIndex + 1];
  const residual = argv.slice(outputArgIndex + 2);

  log_verbose(`Running terser/index.js
  inputs: ${inputs}
  output: ${output}
  residual: ${residual}`);

  if (!inputs.find(isDirectory) && inputs.length) {
    // Inputs were only files
    // Just use terser CLI exactly as it works outside bazel
    runTerserCli();

  } else if (inputs.length > 1) {
    // We don't know how to merge multiple input dirs to one output dir
    throw new Error('terser_minified only allows a single input when minifying a directory');

  } else if (inputs[0]) {
    terserDirectory(inputs[0], output, residual);
  }
}

function workerMain() {
  log_verbose(`worker [${worker_threads.threadId}] - spawned`)

  worker_threads.parentPort.on('message', data => {
    log_verbose(`worker [${worker_threads.threadId}] - job recieved`)
    // modify the argv so that the terser cli can interpret it correctly
    process.argv = data.args;
    try {
      runTerserCli();
      setTimeout(() => worker_threads.parentPort.postMessage({success: true}), 20000)
      //
    } catch (error) {
      console.log(process.exitCode)
      console.log('eeeeeeeeee', error)

      worker_threads.parentPort.postMessage({
        success: false,
        error: error.message,
      });
    }
  })
}

if (worker_threads.isMainThread) {
  main();
} else {
  workerMain();
}