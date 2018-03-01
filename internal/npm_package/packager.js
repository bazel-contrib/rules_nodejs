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

function mkdirp(p) {
  if (!fs.existsSync(p)) {
    mkdirp(path.dirname(p));
    fs.mkdirSync(p);
  }
}

function write(p, content) {
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content);
}

// TODO(alexeagle): add support for version stamping, we might want to replace
// the version number in some of the files (eg. take the latest git tag and
// overwrite the version in package.json)

function main(args) {
  const [outDir, baseDir, srcsArg, binDir, genDir, depsArg, packPath, publishPath] = args;

  // src like baseDir/my/path is just copied to outDir/my/path
  for (src of srcsArg.split(',').filter(s => !!s)) {
    const content = fs.readFileSync(src, {encoding: 'utf-8'});
    const outPath = path.join(outDir, path.relative(baseDir, src));
    write(outPath, content);
  }

  // deps like bazel-bin/baseDir/my/path is copied to outDir/my/path
  for (dep of depsArg.split(',').filter(s => !!s)) {
    const content = fs.readFileSync(dep, {encoding: 'utf-8'});
    let rootDir;
    if (!path.relative(binDir, dep).startsWith('..')) {
      rootDir = binDir;
    } else if (!path.relative(genDir, dep).startsWith('..')) {
      rootDir = genDir;
    } else {
      throw new Error(`dependency ${dep} is not under bazel-bin or bazel-genfiles`);
    }
    const outPath = path.join(outDir, path.relative(path.join(rootDir, baseDir), dep));
    write(outPath, content);
  }

  const npmTemplate =
      fs.readFileSync(require.resolve('nodejs/run_npm.sh.template'), {encoding: 'utf-8'});
  fs.writeFileSync(packPath, npmTemplate.replace('TMPL_args', `pack ${outDir}`));
  fs.writeFileSync(publishPath, npmTemplate.replace('TMPL_args', `publish ${outDir}`));
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
