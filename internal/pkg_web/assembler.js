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
const isBinary = require('isbinaryfile').isBinaryFileSync;

/**
 * Create a new directory and any necessary subdirectories
 * if they do not exist.
 */
function mkdirp(p) {
  if (!fs.existsSync(p)) {
    mkdirp(path.dirname(p));
    fs.mkdirSync(p);
  }
}

function unquoteArgs(s) {
  return s.replace(/^'(.*)'$/, '$1');
}

function getBazelStatusMappings(statusFilePath) {
  if (!statusFilePath) return {};
  const stampFileLines = fs.readFileSync(statusFilePath, {encoding: 'utf-8'}).trim().split('\n');
  const stampMap = {};
  for (const line of stampFileLines) {
    const [key, value] = line.split(' ');
    stampMap[key] = value;
  }
  return stampMap;
}

function normalizeSubstitutions(substitutionsArg, stampMap) {
  const substitutions = JSON.parse(substitutionsArg);

  const normalizedSubstitutions = {};

  for (const occurrence in substitutions) {
    let substituteWith = substitutions[occurrence];
    if (substituteWith.match(/^{.*?}$/)) {
      substituteWith = substituteWith.replace(/^{(.*?)}$/, '$1');
      if (!stampMap[substituteWith]) {
        throw new Error(`Could not find ${substituteWith} key in status file.`);
      }
      substituteWith = stampMap[substituteWith];
    }
    normalizedSubstitutions[occurrence] = substituteWith;
  }
  return normalizedSubstitutions;
}

function main(params) {
  const outdir = params.shift();

  const volatileFilePath = params.shift();

  const stableFilePath = params.shift();

  const rawSubstitutions = params.shift().replace(/^'(.*)'$/, '$1');

  const stampMap = {
    ...getBazelStatusMappings(volatileFilePath),
    ...getBazelStatusMappings(stableFilePath),
  };

  const normalizedSubstitutions = normalizeSubstitutions(rawSubstitutions, stampMap)

  const substitutions = Object.entries(normalizedSubstitutions);

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

  function copy(f, substitutions) {
    if (fs.statSync(f).isDirectory()) {
      for (const file of fs.readdirSync(f)) {
        // Change paths to posix
        copy(path.join(f, file).replace(/\\/g, '/'), substitutions);
      }
    } else if (!isBinary(f)) {
      const dest = path.join(outdir, relative(f));
      let content = fs.readFileSync(f, {encoding: 'utf-8'});
      substitutions.forEach(([occurrence, replaceWith]) => {
        content = content.replace(occurrence, replaceWith);
      });
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      fs.writeFileSync(dest, content);
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
    copy(f, substitutions);
  }
  return 0;
}

module.exports = {main};

if (require.main === module) {
  // We always require the arguments are encoded into a flagfile
  // so that we don't exhaust the command-line limit.
  const params = fs.readFileSync(process.argv[2], {encoding: 'utf-8'})
                     .split('\n')
                     .filter(l => !!l)
                     .map(unquoteArgs);
  process.exitCode = main(params);
}
