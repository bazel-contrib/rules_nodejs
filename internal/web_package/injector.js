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

const parse5 = require('parse5');
const treeAdapter = require('parse5/lib/tree-adapters/default');
const fs = require('fs');
const path = require('path');

function findElementByName(d, name) {
  if (treeAdapter.isTextNode(d)) return undefined;
  if (d.tagName && d.tagName.toLowerCase() === name) {
    return d;
  }
  if (!treeAdapter.getChildNodes(d)) {
    return undefined;
  }
  for (let i = 0; i < treeAdapter.getChildNodes(d).length; i++) {
    const f = treeAdapter.getChildNodes(d)[i];
    const result = findElementByName(f, name);
    if (result) return result;
  }
  return undefined;
}

function main(params, read = fs.readFileSync, write = fs.writeFileSync, timestamp = Date.now) {
  const outputFile = params.shift();
  const inputFile = params.shift();
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

  const document = parse5.parse(read(inputFile, {encoding: 'utf-8'}), {treeAdapter});

  const body = findElementByName(document, 'body');
  if (!body) {
    throw ('No <body> tag found in HTML document');
  }

  const head = findElementByName(document, 'head');
  if (!head) {
    throw ('No <head> tag found in HTML document');
  }

  /**
   * Trims the longest prefix from the path
   */
  function relative(execPath) {
    for (const r of rootDirs) {
      if (execPath.startsWith('external/')) {
        execPath = execPath.substring('external/'.length);
      }
      if (execPath.startsWith(r)) {
        return execPath.substring(r.length);
      }
    }
    return execPath;
  }

  for (const s of params.filter(s => /\.js$/.test(s))) {
    const script = treeAdapter.createElement('script', undefined, [
      {name: 'type', value: 'text/javascript'},
      {name: 'src', value: `/${relative(s)}?v=${timestamp()}`},
    ]);
    treeAdapter.appendChild(body, script);
  }

  for (const s of params.filter(s => /\.css$/.test(s))) {
    const stylesheet = treeAdapter.createElement('link', undefined, [
      {name: 'rel', value: 'stylesheet'},
      {name: 'href', value: `/${relative(s)}?v=${timestamp()}`},
    ]);
    treeAdapter.appendChild(head, stylesheet);
  }

  const content = parse5.serialize(document, {treeAdapter});
  write(outputFile, content, {encoding: 'utf-8'});
  return 0;
}

module.exports = {main};

if (require.main === module) {
  // We always require the arguments are encoded into a flagfile
  // so that we don't exhaust the command-line limit.
  const params = fs.readFileSync(process.argv[2], {encoding: 'utf-8'}).split('\n').filter(l => !!l);
  process.exitCode = main(params);
}
