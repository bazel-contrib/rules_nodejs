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

function write(p, content, replacements) {
  mkdirp(path.dirname(p));
  replacements.forEach(r => {
    const [regexp, newvalue] = r;
    content = content.replace(regexp, newvalue);
  });
  fs.writeFileSync(p, content);
}

function unquoteArgs(s) {
  return s.replace(/^'(.*)'$/, '$1');
}

function main(args) {
  args = fs.readFileSync(args[0], {encoding: 'utf-8'}).split('\n').map(unquoteArgs);
  const
      [outDir, baseDir, srcsArg, binDir, genDir, depsArg, replacementsArg, packPath, publishPath,
       stampFile] = args;

  const replacements = [
    // Strip content between BEGIN-INTERNAL / END-INTERNAL comments
    [/(#|\/\/)\s+BEGIN-INTERNAL[\w\W]+END-INTERNAL/g, ''],
  ];
  if (stampFile) {
    // The stamp file is expected to look like
    // BUILD_SCM_HASH 83c699db39cfd74526cdf9bebb75aa6f122908bb
    // BUILD_SCM_LOCAL_CHANGES true
    // BUILD_SCM_VERSION 6.0.0-beta.6+12.sha-83c699d.with-local-changes
    // BUILD_TIMESTAMP 1520021990506
    const version = fs.readFileSync(stampFile, {encoding: 'utf-8'})
                        .split('\n')
                        .find(s => s.startsWith('BUILD_SCM_VERSION'))
                        .split(' ')[1]
                        .trim();
    replacements.push([/0.0.0-PLACEHOLDER/g, version]);
  }
  const rawReplacements = JSON.parse(replacementsArg);
  for (let key of Object.keys(rawReplacements)) {
    replacements.push([new RegExp(key, 'g'), rawReplacements[key]])
  }

  // src like baseDir/my/path is just copied to outDir/my/path
  for (src of srcsArg.split(',').filter(s => !!s)) {
    const content = fs.readFileSync(src, {encoding: 'utf-8'});
    const outPath = path.join(outDir, path.relative(baseDir, src));
    write(outPath, content, replacements);
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
    write(outPath, content, replacements);
  }

  const npmTemplate =
      fs.readFileSync(require.resolve('nodejs/run_npm.sh.template'), {encoding: 'utf-8'});
  fs.writeFileSync(packPath, npmTemplate.replace('TMPL_args', `pack ${outDir}`));
  fs.writeFileSync(publishPath, npmTemplate.replace('TMPL_args', `publish ${outDir}`));
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
