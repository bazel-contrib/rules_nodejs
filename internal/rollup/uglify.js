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

const UglifyJS = require("uglify-js");
const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  throw new Error("input_path and output_path arguments required");
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const args = process.argv.slice(4);
let debug = false;
args.forEach(a => {
  if (a === '--debug') {
    debug = true;
  }
})

const uglifyOptions = {
  "compress": {
    "pure_getters": true,
    "passes": 3,
    "global_defs": {
      "ngDevMode": false
    }
  },
  "mangle": !debug
};

if (!fs.existsSync(outputPath)){
    fs.mkdirSync(outputPath);
}
const dir = fs.readdirSync(inputPath);
dir.forEach(f => {
  const inputFile = path.join(inputPath, path.basename(f));
  const outputFile = path.join(outputPath, path.basename(f));
  console.log(`Minifying ${inputFile} -> ${outputFile}`);
  const code = fs.readFileSync(inputFile, {encoding: 'utf-8'});
  const result = UglifyJS.minify(code, uglifyOptions);
  if (result.error) {
    throw result.error;
  }
  fs.writeFileSync(outputFile, result.code, 'utf8');
});
