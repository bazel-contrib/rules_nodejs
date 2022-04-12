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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

function _getArg(argv: string[], key: string): string {
  return argv.find(a => a.startsWith(key))!.split('=')[1];
}

/**
 * This is designed to collect the coverage of one target, since in nodejs
 * and using NODE_V8_COVERAGE it may produce more than one coverage file, however bazel expects
 * there to be only one lcov file. So this collects up the v8 coverage json's merges them and
 * converts them to lcov for bazel to pick up later.
 */
async function main() {
  // Using the standard args for a bazel lcov merger binary:
  // https://github.com/bazelbuild/bazel/blob/master/tools/test/collect_coverage.sh#L175-L181
  const argv = process.argv;
  const coverageDir = _getArg(argv, '--coverage_dir=');
  const outputFile = _getArg(argv, '--output_file=');
  const sourceFileManifest = _getArg(argv, '--source_file_manifest=');
  const tmpdir = process.env.TEST_TMPDIR;

  if (!sourceFileManifest || !tmpdir || !outputFile) {
    throw new Error();
  }

  const instrumentedSourceFiles = fs.readFileSync(sourceFileManifest).toString('utf8').split('\n');
  // c8 will name the output report file lcov.info
  // so we give it a dir that it can write to
  // later on we'll move and rename it into output_file as bazel expects
  const c8OutputDir = path.join(tmpdir!, crypto.randomBytes(4).toString('hex'));
  fs.mkdirSync(c8OutputDir);

  const includes =
      instrumentedSourceFiles
          // the manifest may include files such as .bash so we want to reduce that down to the set
          // we can run coverage on in JS
          .filter(f => ['.js', '.jsx', '.cjs', '.ts', '.tsx', '.mjs'].includes(path.extname(f)))
          .map(f => {
            // at runtime we only run .js or .mjs
            // meaning that the coverage written by v8 will only include urls to .js or .mjs
            // so the source files need to be mapped from their input to output extensions
            // TODO: how do we know what source files produce .mjs or .cjs?
            const p = path.parse(f);
            let targetExt;
            switch (p.ext) {
              case '.mjs':
                targetExt = '.mjs';
              default:
                targetExt = '.js';
            }

            return path.format({...p, base: undefined, ext: targetExt});
          });

  // only require in c8 when we're actually going to do some coverage
  let c8;
  try {
    c8 = require('c8');
  } catch (e: any) {
    if (e.code == 'MODULE_NOT_FOUND') {
      console.error('ERROR: c8 npm package is required for bazel coverage');
      process.exit(1);
    }
    throw e;
  }
  // see https://github.com/bcoe/c8/blob/master/lib/report.js
  // for more info on this function
  // TODO: enable the --all functionality
  await new c8
      .Report({
        include: includes,
        // the test-exclude lib will include everything if our includes array is empty
        // so instead when it's empty exclude everything
        // but when it does have a value, we only want to use those includes, so don't exclude
        // anything
        exclude: includes.length === 0 ? ['**'] : [],
        reportsDirectory: c8OutputDir,
        // tempDirectory as actually the dir that c8 will read from for the v8 json files
        tempDirectory: coverageDir,
        resolve: '',
        all: true,
        // TODO: maybe add an attribute to allow more reporters
        // or maybe an env var?
        reporter: ['lcovonly']
      })
      .run();
  // moves the report into the files bazel expects
  // and fixes the paths as we're moving it up 3 dirs
  const inputFile = path.join(c8OutputDir, 'lcov.info');
  // we want to do this 1 line at a time to avoid using too much memory
  const input = readline.createInterface({
    input: fs.createReadStream(inputFile),
  });
  const output = fs.createWriteStream(outputFile);

  input.on('line', line => {
    const patched = line.replace('SF:../../../', 'SF:')
    output.write(patched + '\n');
  });
}

if (require.main === module) {
  main();
}
