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

/**
 * A bazel worker process for running rollup.
 *
 * Arguments:
 *  --input.* value
 *      Param and value to put into rollup inputOptions
 *
 *  --output.* value
 *      Param and value to put into rollup outputOptions
 *
 *  --entry path/to/entry
 *      The entry file, converted to rollup "input"
 *
 *  --entries x=path/to/x y=path/to/y
 *      Multiple entry files, converted to rollup "input"
 *
 *  --config x
 *      Custom rollup config file. Some options overridden by bazel
 */

const path = require('path');
const rollup = require('rollup');
const worker = require('@bazel/worker');

const MNEMONIC = 'Rollup';

const INPUT_ARG_PREFIX = '--input.';
const OUTPUT_ARG_PREFIX = '--output.';

// Parse the worker CLI args from rollup_bundle.bzl into rollup input/outputOptions
function parseCLIArgs(args) {
  let entries = null;
  let inputOptions = {};
  let outputOptions = {};
  let configFile = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith(INPUT_ARG_PREFIX)) {
      inputOptions[arg.slice(INPUT_ARG_PREFIX.length)] = args[++i];
    } else if (arg.startsWith(OUTPUT_ARG_PREFIX)) {
      outputOptions[arg.slice(OUTPUT_ARG_PREFIX.length)] = args[++i];
    } else if (arg === '--config') {
      configFile = args[++i];
    } else if (arg === '--entry') {
      if (entries) {
        throw new Error(`${MNEMONIC}: only one of --entry or --entries`);
      }

      entries = args[++i];
    } else if (arg === '--entries') {
      if (entries) {
        throw new Error(`${MNEMONIC}: only one of --entry or --entries`);
      }

      entries = {};
      do {
        const [entryName, entryPath] = args[++i].split('=', 2);
        entries[entryName] = entryPath;
      } while (i < args.length && !args[i + 1].startsWith('--'));
    } else {
      throw new Error(`${MNEMONIC}: unknown worker param: ${arg}`);
    }
  }

  // Additional options passed via config file
  if (configFile) {
    const config = require(path.resolve(configFile));

    if (config.output) {
      outputOptions = {...config.output, ...outputOptions};
      delete config.output;
    }

    inputOptions = {...config, ...inputOptions};
  }

  // Prevent rollup's module resolver from hopping outside Bazel's sandbox
  // When set to false, symbolic links are followed when resolving a file.
  // When set to true, instead of being followed, symbolic links are treated as if the file is
  // where the link is.
  inputOptions.preserveSymlinks = true;

  // The inputs are the rule entry_point[s]
  inputOptions.input = entries;

  return {inputOptions, outputOptions};
}


// Store the cache forever to re-use on each build
let cache = undefined;

// Run rollup, will use + re-populate the cache
async function runRollupBundler(args /*, inputs*/) {
  const {inputOptions, outputOptions} = parseCLIArgs(args);

  const bundle = await rollup.rollup({...inputOptions, cache});

  cache = bundle.cache;

  try {
    await bundle.write(outputOptions);
  } catch (e) {
    worker.log(e);
    return false;
  }

  return true;
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
        `Started a new process to perform this action. Your build might be misconfigured, try --strategy=${
            MNEMONIC}=worker`);

    // Parse the options from the bazel-supplied options file.
    // The first argument to the program is prefixed with '@'
    // because Bazel does that for param files. Strip it first.
    const paramFile = process.argv[2].replace(/^@/, '');
    const args = require('fs').readFileSync(paramFile, 'utf-8').trim().split('\n');

    return await runRollupBundler(args) ? 0 : 1;
  }
}


if (require.main === module) {
  main(process.argv.slice(2)).then(r => process.exitCode = r);
}
