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
 * Replaces directory url with the outputFile name in the url option of source-map argument
 */
function directoryArgs(residualArgs, inputFile, outputFile) {
  const sourceMapIndex = residualArgs.indexOf('--source-map');
  if (sourceMapIndex === -1) {
    return residualArgs;
  }

  // set the correct sourcemap url for this output file
  let sourceMapOptions = residualArgs[sourceMapIndex + 1].split(',').map(
      o => o.startsWith('url=') ? `url='${path.basename(outputFile)}.map'` : o);

  // if an input .map file exists then set the correct sourcemap content option
  if (fs.existsSync(`${inputFile}.map`)) {
    // even on Windows terser expects '/' path separators so we normalize these in the sourcemap
    // content file path below
    sourceMapOptions = sourceMapOptions.map(
        o => o.startsWith('content=') ? `content='${inputFile.replace(/\\/g, '/')}.map'` : o);
  }

  return [
    ...residualArgs.slice(0, sourceMapIndex + 1),
    sourceMapOptions.join(','),
    ...residualArgs.slice(sourceMapIndex + 2),
  ];
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
    let args = [
      terserBinary, inputFile, '--output', outputFile,
      ...directoryArgs(residual, inputFile, outputFile)
    ];

    spawn(process.execPath, [...process.execArgv, ...args])
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
    if (path.extname(f) === '.js' || path.extname(f) === '.mjs') {
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

  // Allow for user to override terser binary for testing.
  let terserBinary = process.env.TERSER_BINARY;
  try {
    // If necessary, get the new `terser` binary, added for >=4.3.0
    terserBinary = terserBinary || require.resolve('terser/bin/terser');
  } catch (e) {
    try {
      // If necessary, get the old `uglifyjs` binary from <4.3.0
      terserBinary = terserBinary || require.resolve('terser/bin/uglifyjs');
    } catch (e) {
      throw new Error('terser binary not found. Maybe you need to set the terser_bin attribute?')
    }
  }
  // choose a default concurrency of the number of cores -1 but at least 1.

  log_verbose(`Running terser/index.js
  inputs: ${inputs}
  output: ${output}
  residual: ${residual}`);

  if (!inputs.find(isDirectory) && inputs.length) {
    // Inputs were only files
    // Just use terser CLI exactly as it works outside bazel
    require(terserBinary);

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
