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
const child_process = require('child_process');
const os = require('os')

// Run Bazel with --define=VERBOSE_LOGS=1 to enable this logging
const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];

function log_verbose(...m) {
  if (VERBOSE_LOGS) console.error('[terser/index.js]', ...m);
}

function log_error(...m) {
  console.error('[terser/index.js]', ...m);
}

function isDirectory(input) {
  return fs.lstatSync(path.join(process.cwd(), input)).isDirectory();
}

/**
 * Replaces <OUTPUT_MAP_FILE> with the outputFile name in the source-map options argument
 */
function directoryArgs(residualArgs, outputFile) {
  const sourceMapIndex = residualArgs.indexOf('--source-map');
  if (sourceMapIndex === -1) {
    return residualArgs;
  }

  // copy args so we don't accidently mutate and process the same set of args twice
  const argsCopy = [...residualArgs];

  // the options for the source map arg is the next one
  // if it changes in terser_minified.bzl this needs to be updated
  const sourceMapOptsIndex = sourceMapIndex + 1
  const sourceMapOptsStr = argsCopy[sourceMapOptsIndex];

  argsCopy[sourceMapOptsIndex] =
      sourceMapOptsStr.replace('<OUTPUT_MAP_FILE>', `${path.basename(outputFile)}.map`);

  return argsCopy;
}

function terserDirectory(input, output, residual, terserBinary) {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  const TERSER_CONCURENCY = (process.env.TERSER_CONCURRENCY || os.cpus().length - 1) || 1

  let work = [];
  let active = 0;
  let errors = [];

  function exec([inputFile, outputFile]) {
    active++;
    let args =
        [terserBinary, inputFile, '--output', outputFile, ...directoryArgs(residual, outputFile)];

    spawn(process.execPath, args)
        .then(
            (data) => {
              if (data.code) {
                errors.push(inputFile)
                // NOTE: Even though a terser process has errored we continue here to collect all of
                // the errors. this behavior is another candidate for user configuration because
                // there is value in stopping at the first error in some use cases.

                log_error(`errored: ${inputFile}\nOUT: ${data.out}\nERR: ${data.err}\ncode: ${
                    data.code}`);
              } else {
                log_verbose('finished: ', inputFile);
              }
              --active;
              next();
            },
            (err) => {
              --active;
              log_error('errored: [spawn exception]', inputFile, '\n' + err)
              errors.push(inputFile)
              next();
            })
  }

  function next() {
    if (work.length) {
      exec(work.shift());
    } else if (!active) {
      if (errors.length) {
        log_error('terser errored processing javascript in directory.')
        process.exitCode = 2;
      }
      // NOTE: work is done at this point and node should exit here.
    }
  }

  fs.readdirSync(input).forEach(f => {
    if (f.endsWith('.js')) {
      const inputFile = path.join(input, path.basename(f));
      const outputFile = path.join(output, path.basename(f));

      if (active < TERSER_CONCURENCY) {
        exec([inputFile, outputFile]);
      } else {
        work.push([inputFile, outputFile])
      }
    }
  });
}

function spawn(cmd, args) {
  return new Promise((resolve, reject) => {
    const err = [];
    const out = [];
    // this may throw syncronously if the process cannot be created.
    let proc = child_process.spawn(cmd, args);

    proc.stdout.on('data', (buf) => {
      out.push(buf);
    });
    proc.stderr.on('data', (buf) => {err.push(buf)})
    proc.on('exit', (code) => {
      // we never reject here based on exit code because an error is a valid result of running a
      // process.
      resolve({out: Buffer.concat(out), err: err.length ? Buffer.concat(err) : false, code});
    });
  })
}

function main() {
  // Peek at the arguments to find any directories declared as inputs
  let argv = process.argv.slice(2);
  // terser_minified.bzl always passes the inputs first,
  // then --output [out], then remaining args
  // We want to keep those remaining ones to pass to terser
  // Avoid a dependency on a library like minimist; keep it simple.
  const outputArgIndex = argv.findIndex((arg) => arg.startsWith('--'));

  // We don't want to implement a command-line parser for terser
  // so we invoke its CLI as child processes when a directory is provided, just altering the
  // input/output arguments. See discussion: https://github.com/bazelbuild/rules_nodejs/issues/822

  const inputs = argv.slice(0, outputArgIndex);
  const output = argv[outputArgIndex + 1];
  const residual = argv.slice(outputArgIndex + 2);

  // user override for the terser binary location. used in testing.
  const terserBinary = process.env.TERSER_BINARY || require.resolve('terser/bin/uglifyjs')
  // choose a default concurrency of the number of cores -1 but at least 1.

  log_verbose(`Running terser/index.js
  inputs: ${inputs}
  output: ${output}
  residual: ${residual}`);

  if (!inputs.find(isDirectory) && inputs.length) {
    // Inputs were only files
    // Just use terser CLI exactly as it works outside bazel
    require(terserBinary || 'terser/bin/uglifyjs');

  } else if (inputs.length > 1) {
    // We don't know how to merge multiple input dirs to one output dir
    throw new Error('terser_minified only allows a single input when minifying a directory');

  } else if (inputs[0]) {
    terserDirectory(inputs[0], output, residual, terserBinary);
  }
}

// export this for unit testing purposes
exports.directoryArgs = directoryArgs;

if (require.main === module) {
  main();
}