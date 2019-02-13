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

function main(params) {
  const outdir = params.shift();
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);

  const rootDirs = [];
  while (params.length && params[0] !== '--assets') {
    let r = params.shift();
    if (!r.endsWith('/')) {
      r += '/';
    }
    rootDirs.push(r);
  }
  // Always trim the longest prefix
  rootDirs.sort((a, b) => b.length - a.length);
  params.shift(); // --assets

  function relative(execPath) {
    if (execPath.startsWith('external/')) {
      execPath = execPath.substring('external/'.length);
    }
    for (const r of rootDirs) {
      if (execPath.startsWith(r)) {
        return execPath.substring(r.length);
      }
    }
    return execPath;
  }

  function copy(f) {
    if (fs.statSync(f).isDirectory()) {
      for (const file of fs.readdirSync(f)) {
        copy(path.join(f, file));
      }
    } else {
      const dest = path.join(outdir, relative(f));
      mkdirp(path.dirname(dest));
      fs.copyFileSync(f, dest);
    }
  }

  // Remove duplicate files (which may come from this rule) from the
  // list since fs.copyFileSync may fail with `EACCES: permission denied`
  // as it will not have permission to overwrite duplicate files that were
  // copied from within bazel-bin.
  // See https://github.com/bazelbuild/rules_nodejs/pull/546.
  for (const f of new Set(params)) {
    copy(f);
  }
  return 0;
}

module.exports = {main};

if (require.main === module) {
  // We always require the arguments are encoded into a flagfile
  // so that we don't exhaust the command-line limit.
  const params = fs.readFileSync(process.argv[2], {encoding: 'utf-8'}).split('\n').filter(l => !!l);
  process.exitCode = main(params);
}
