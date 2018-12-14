/**
 * @license
 * Copyright 2018 The Bazel Authors. All rights reserved.
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

const fs = require('fs');
const path = require('path');

function main(args) {
  const params = fs.readFileSync(args[0], {encoding: 'utf-8'}).split('\n').filter(l => !!l);

  const outdir = params.shift();
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);

  for (const f of params) {
    if (fs.statSync(f).isDirectory()) {
      const foutDir = path.join(outdir, path.basename(f));
      fs.mkdirSync(foutDir);
      for (const file of fs.readdirSync(f)) {
        const content = fs.readFileSync(path.join(f, file), {encoding: 'utf-8'});
        fs.writeFileSync(path.join(foutDir, path.basename(file)), content, {encoding: 'utf-8'});
      }
    } else {
      const content = fs.readFileSync(f, {encoding: 'utf-8'});
      fs.writeFileSync(path.join(outdir, path.basename(f)), content, {encoding: 'utf-8'});
    }
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
