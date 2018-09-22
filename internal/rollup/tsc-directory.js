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

// A wrapper around tsc that handle running tsc on all files
// in a folder and also copies over all .js.map files to the
// output folder

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const DEBUG = false;

// capture the inputs and output options
const argv = require('minimist')(process.argv.slice(2));
const input = argv.input;
const output = argv.output;
const project = argv.project;

if (DEBUG)
  console.error(`
tsc-directory: running with
  cwd: ${process.cwd()}
  input: ${input}
  output: ${output}
  project: ${project}
`);

function runTsc(inputDir, outputDir, projectFile) {
  if (DEBUG) console.error(`Running tsc with ${project}`);

  const inputBasename = path.relative(path.dirname(projectFile), inputDir);
  const outputBasename = path.relative(path.dirname(projectFile), outputDir);

  const tsConfig = {
    'compilerOptions': {
      'target': 'es5',
      'lib': ['es6'],
      'allowJs': true,
      'outDir': outputBasename,
    },
    'include': [`${inputBasename}/*`],
    'exclude': []
  };

  fs.writeFileSync(projectFile, JSON.stringify(tsConfig));

  const args = [
    require.resolve('build_bazel_rules_nodejs_rollup_deps/node_modules/typescript/lib/tsc.js'),
    '--project', projectFile
  ];

  if (DEBUG) console.error(`Running node ${args.join(' ')}`);

  const isWindows = /^win/i.test(process.platform);
  child_process.execFileSync(
      isWindows ? 'node.cmd' : 'node', args,
      {stdio: [process.stdin, process.stdout, process.stderr]});
}

// run tsc to generate the output .js files
runTsc(input, output, project)

// copy all .js.map files from the input directory to the output directory
const dir = fs.readdirSync(input);
dir.forEach(f => {
  if (f.endsWith('.js.map')) {
    const inputFile = path.join(input, path.basename(f));
    const outputFile = path.join(output, path.basename(f));
    fs.copyFileSync(inputFile, outputFile);
  }
});
