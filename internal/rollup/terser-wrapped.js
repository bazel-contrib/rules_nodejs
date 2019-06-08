/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// A wrapper around terser-js that can handle minifying an entire
// directory. If the input is a directory then terser is run on
// each .js file in that folder and outputs to a specified output
// folder. If the input is a file then terser is just run
// one that individual file.
const fs = require('fs');
const path = require('path');

// worker_threads is only avilable on version > 10.5.0
const [major, minor] = process.version.replace('v', '').split('.');
const WORKER_THREADS_AVILABLE = major > 10 || major == 10 && minor > 5
let worker_threads;

if (WORKER_THREADS_AVILABLE) {
  worker_threads = require('worker_threads');
} else {
  console.warn(
      `WARNING: worker_threads not are not avilable on your version of Nodejs: ${process.version}
    Running Terser in serial mode
    Upgrade your Nodejs version to 10.5.0 minimum for worker_threads to be avilable`)
}

const DEBUG = false;
const TERSER_MODULE_LOCATION = 'build_bazel_rules_nodejs_rollup_deps/node_modules/terser';

function main() {
  // capture the inputs and output options
  const argv = require('minimist')(process.argv.slice(2));
  const inputs = argv._;
  const output = argv.output || argv.o;
  const debug = argv.debug;

  if (DEBUG)
    console.error(`
  terser: running with
    cwd: ${process.cwd()}
    argv: ${process.argv.slice(2).join(' ')}
    inputs: ${JSON.stringify(inputs)}
    output: ${output}
    debug: ${debug}
    worker_threads: ${WORKER_THREADS_AVILABLE}
  `);

  if (inputs.length != 1) {
    throw new Error(`Only one input file supported: ${inputs}`);
  }

  const input = inputs[0];

  const isDirectory = fs.lstatSync(path.join(process.cwd(), input)).isDirectory();

  if (!isDirectory) {
    runTerser(input, output, output + '.map', require(TERSER_MODULE_LOCATION));
  } else {
    if (!fs.existsSync(output)) {
      fs.mkdirSync(output);
    }
    const dir = fs.readdirSync(input);
    const files = dir.filter(f => f.endsWith('.js')).map(f => {
      const inputFile = path.join(input, path.basename(f));
      const outputFile = path.join(output, path.basename(f));
      return {inputFile, outputFile, sourceMapFile: outputFile + '.map'};
    })

    if (WORKER_THREADS_AVILABLE) {
      runTerserParallel(files, debug);
    }
    else {
      runTerserSerial(files, debug)
    }
  }
}

/**
 *
 * @param {string} sourceMapFile
 * @param {boolean} debug
 * @returns {any}
 */
function buildTerserConfig(sourceMapFile, debug) {
  const terserConfig = {
    'sourceMap': {'filename': sourceMapFile},
    'compress': {
      'pure_getters': true,
      'passes': 3,
      'global_defs': {'ngDevMode': false, 'ngI18nClosureMode': false},
      'keep_fnames': !debug,
      'reduce_funcs': !debug,
      'reduce_vars': !debug,
      'sequences': !debug,
    },
    'mangle': !debug,
  };
  return terserConfig;
}

/**
 *
 * @param {{inputFile: string, outputFile: string, sourceMapFile: string}[]} files
 * @param {boolean} debug
 */
async function runTerserSerial(files, debug) {
  const Terser = require(TERSER_MODULE_LOCATION);
  for (const f of files) {
    // run one set of terser at a time
    await runTerser(f.inputFile, f.outputFile, f.sourceMapFile, Terser, debug);
  }
}

/**
 *
 * @param {{inputFile: string, outputFile: string, sourceMapFile: string}[]} files
 * @param {boolean} debug
 */
async function runTerserParallel(files, debug) {
  // TODO: do some concurrency limiting here
  await Promise.all(
      files.map(f => runTerserThread(f.inputFile, f.outputFile, f.sourceMapFile, debug)));
}

/**
 *
 * @param {string} inputFile
 * @param {string} outputFile
 * @param {string} sourceMapFile
 * @param {boolean} debug
 * @returns {Promise<void>}
 */
function runTerserThread(inputFile, outputFile, sourceMapFile, debug) {
  return new Promise((resolve, reject) => {
    const task = {
      inputFile,
      outputFile,
      sourceMapFile,
      terser: require.resolve(TERSER_MODULE_LOCATION),
      debug
    } const worker = new worker_threads.Worker(__filename, {workerData: task});

    worker.on('exit', () => resolve());
    worker.on('error', err => reject(err));
  })
}

/**
 *
 * @param {string} inputFile
 * @param {string} outputFile
 * @param {string} sourceMapFile
 * @param {Function} Terser
 * @param {boolean} debug
 * @returns {Promise<void>}
 */
async function runTerser(inputFile, outputFile, sourceMapFile, Terser, debug) {
  if (DEBUG) console.error(`Minifying ${inputFile} -> ${outputFile} (sourceMap ${sourceMapFile})`);

  const terserOptions = buildTerserConfig(sourceMapFile, debug)
  const inputCode = (await fs.promises.readFile(inputFile)).toString();
  const result = Terser.minify(inputCode, terserOptions);

  if (result.error) {
    // TODO: is this the best way to handle this error?
    throw result.error;
  } else {
    await fs.promises.writeFile(outputFile, result.code);
  }
}

async function workerMain() {
  const task = worker_threads.workerData;
  const terser = require(task.terser);
  runTerser(task.inputFile, task.outputFile, task.sourceMapFile, terser, task.debug);
}

if (WORKER_THREADS_AVILABLE) {
  if (worker_threads.isMainThread) {
    main();
  } else {
    workerMain();
  }
} else {
  main();
}
