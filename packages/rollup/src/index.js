/**
 * @license
 * Copyright 2020 The Bazel Authors. All rights reserved.
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
const path = require('path');
const rollup = require('rollup');
const crypto = require('crypto')

const MNEMONIC = 'Rollup';
const PID = process.pid;

let worker;
try {
  worker = require('./worker');
} catch {
  // TODO: rely on the linker to link the first-party package
  const helper = process.env['BAZEL_NODE_RUNFILES_HELPER'];
  if (!helper) throw new Error('No runfiles helper and no @bazel/worker npm package');
  const runfiles = require(helper);
  const workerRequire = runfiles.resolve('build_bazel_rules_nodejs/packages/rollup/worker.js');
  if (!workerRequire)
    throw new Error(`build_bazel_rules_nodejs/packages/rollup/worker.js missing in runfiles ${
        JSON.stringify(runfiles.manifest)}, ${runfiles.dir}`);
  worker = require(workerRequire);
}

// Store the cache forever to re-use on each build
let cacheMap = Object.create(null);

// Generate a unique cache ID based on the given json data
function computeCacheKey(cacheKeyData) {
  const hash = crypto.createHash('sha256');
  const hashContent = JSON.stringify(cacheKeyData);
  return hash.update(hashContent).digest('hex');
}

async function runRollup(cacheKeyData, inputOptions, outputOptions) {
  const cacheKey = computeCacheKey(cacheKeyData);

  let cache = cacheMap[cacheKey];

  const rollupStartTime = Date.now();

  const bundle = await rollup.rollup({...inputOptions, cache});

  const rollupEndTime = Date.now();
  worker.debug(
      `${MNEMONIC}[${PID}][${cacheKey}].rollup()`, (rollupEndTime - rollupStartTime) / 1000);

  cacheMap[cacheKey] = bundle.cache;

  try {
    await bundle.write(outputOptions);
  } catch (e) {
    worker.log(e);
    return false;
  }

  const bundleEndTime = Date.now();
  worker.debug(`${MNEMONIC}[${PID}][${cacheKey}].write()`, (bundleEndTime - rollupEndTime) / 1000);

  return true;
}

// Run rollup, will use + re-populate the cache
async function runRollupBundler(args /*, inputs */) {
  const {inputOptions, outputOptions} = await parseCLIArgs(args);

  return runRollup(inputOptions.input, inputOptions, outputOptions);
}

// Load the config file.
// Must be rollup-ed first to allow use of es6 within the config.
// See the rollup CLI version:
// https://github.com/rollup/rollup/blob/v1.31.0/cli/run/loadConfigFile.ts#L14
async function loadConfigFile(configFile) {
  const cjsConfigFile = configFile + '.cjs.js';

  // inputOptions: https://github.com/rollup/rollup/blob/v1.31.0/cli/run/loadConfigFile.ts#L21-L28
  const inputOptions = {
    external: id => (id[0] !== '.' && !path.isAbsolute(id)) || id.slice(-5, id.length) === '.json',
    input: configFile,
    treeshake: false,
    preserveSymlinks: true,
  };

  // outputOptions: https://github.com/rollup/rollup/blob/v1.31.0/cli/run/loadConfigFile.ts#L35-L38
  const outputOptions = {
    exports: 'named',
    format: 'cjs',
    file: cjsConfigFile,
  };

  await runRollup(configFile, inputOptions, outputOptions);

  // Ensure node isn't caching a previous version of the config file
  // https://github.com/rollup/rollup/blob/v1.31.0/cli/run/loadConfigFile.ts#L52
  delete require.cache[require.resolve(cjsConfigFile)];

  // Read the config file:
  // https://github.com/rollup/rollup/blob/v1.31.0/cli/run/loadConfigFile.ts#L54-L61
  //
  // Supports:
  // * async results
  // * commonjs "default" export
  let config = await Promise.resolve(require(cjsConfigFile));
  if (config.default) {
    config = config.default;
  }

  // Does NOT support (unlike rollup CLI):
  // * factory function
  // * multiple configs for multiple outputs
  if (Array.isArray(config) || typeof config === 'function') {
    throw new Error('Arrays + factory configs unsupported');
  }

  return config;
}

// Processing of --environment CLI options into environment vars
// https://github.com/rollup/rollup/blob/v1.31.0/cli/run/index.ts#L50-L57
function extractEnvironmentVariables(vars) {
  vars.split(',').forEach(pair => {
    const [key, ...value] = pair.split(':');
    if (value.length) {
      process.env[key] = value.join(':');
    } else {
      process.env[key] = String(true);
    }
  });
}

// Parse a subset of supported CLI arguments required for the rollup_bundle rule API.
// Returns input/outputOptions for the rollup.bundle/write() API
//  input:  https://rollupjs.org/guide/en/#inputoptions-object
//  output: https://rollupjs.org/guide/en/#outputoptions-object
async function parseCLIArgs(args) {
  let inputOptions = {
    onwarn(...warnArgs) {
      worker.log(...warnArgs);
    },
  };

  let outputOptions = {};

  let configFile = null;

  // Input files to rollup
  let inputs = [];

  // Followed by suppported rollup CLI options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Non-option is assumed to be an input file
    if (!arg.startsWith('--')) {
      inputs.push(arg);
      continue;
    }

    const option = arg.slice(2);
    switch (option) {
      case 'config':
        configFile = path.resolve(args[++i]);
        break;

      case 'silent':
        inputOptions.onwarn = () => {};
        break;

      case 'format':
      case 'output.dir':
      case 'output.file':
      case 'sourcemap':
        outputOptions[option.replace('output.', '')] = args[++i];
        break;

      case 'preserveSymlinks':
        inputOptions[option] = true;
        break;

      // Common rollup CLI args, but not required for use
      case 'environment':
        extractEnvironmentVariables(args[++i]);
        break;

      default:
        throw new Error(`${MNEMONIC}: invalid or unsupported argument ${arg}`);
    }
  }

  // If outputting a directory then rollup_bundle.bzl passed a series
  // of name=path files as the input.
  // TODO: do some not have the =?
  if (outputOptions.dir) {
    inputs = inputs.reduce((m, nameInput) => {
      const [name, input] = nameInput.split('=', 2);
      m[name] = input;
      return m;
    }, {});
  }

  // Additional options passed via config file
  if (configFile) {
    const config = await loadConfigFile(configFile);

    if (config.output) {
      outputOptions = {...config.output, ...outputOptions};
    }

    inputOptions = {...config, ...inputOptions};

    // Delete from our copied inputOptions, not the config which
    // may be external and persisted across runs
    delete inputOptions.output;
  }

  // The inputs are the rule entry_point[s]
  inputOptions.input = inputs;

  return {inputOptions, outputOptions};
}

async function main(args) {
  // Bazel will pass a special argument to the program when it's running us as a worker
  if (worker.runAsWorker(args)) {
    worker.log(`Running ${MNEMONIC} as a Bazel worker`);

    worker.runWorkerLoop(runRollupBundler);
  } else {
    // Running standalone so stdout is available as usual
    console.log(`Running ${MNEMONIC} as a standalone process`);
    console.error(
        `Started a new process to perform this action. Your build might be misconfigured, try
      --strategy=${MNEMONIC}=worker`);

    // Parse the options from the bazel-supplied options file.
    // The first argument to the program is prefixed with '@'
    // because Bazel does that for param files. Strip it first.
    const paramFile = process.argv[2].replace(/^@/, '');
    const args = require('fs').readFileSync(paramFile, 'utf-8').trim().split('\n');

    return (await runRollupBundler(args)) ? 0 : 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then(r => (process.exitCode = r));
}
