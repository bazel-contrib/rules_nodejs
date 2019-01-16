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

/**
 * Returns true if a file is detected to be binary.
 *
 * This implementation is a slightly modified version of
 * isBinaryFileSync() from https://github.com/gjtorikian/isBinaryFile.
 * The MIT license is included at the top of the function body below.
 */
function isBinary(p) {
  // Copyright (c) 2019 Garen J. Torikian
  //
  // MIT License
  //
  // Permission is hereby granted, free of charge, to any person obtaining
  // a copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to
  // permit persons to whom the Software is furnished to do so, subject to
  // the following conditions:
  //
  // The above copyright notice and this permission notice shall be
  // included in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  // EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  // NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  // LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  // OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  // WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  const MAX_BYTES = 512
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(MAX_BYTES);
  const bytes = fs.readSync(fd, buf, 0, MAX_BYTES, 0);
  fs.closeSync(fd);

  // empty file. no clue what it is.
  if (bytes === 0) {
    return false;
  }

  let suspiciousBytes = 0;
  const totalBytes = Math.min(bytes, MAX_BYTES);

  // UTF-8 BOM
  if (bytes >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return false;
  }

  // UTF-32 BOM
  if (bytes >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xfe && buf[3] === 0xff) {
    return false;
  }

  // UTF-32 LE BOM
  if (bytes >= 4 && buf[0] === 0xff && buf[1] === 0xfe && buf[2] === 0x00 && buf[3] === 0x00) {
    return false;
  }

  // GB BOM
  if (bytes >= 4 && buf[0] === 0x84 && buf[1] === 0x31 && buf[2] === 0x95 && buf[3] === 0x33) {
    return false;
  }

  if (totalBytes >= 5 && buf.slice(0, 5).toString() === '%PDF-') {
    /* PDF. This is binary. */
    return true;
  }

  // UTF-16 BE BOM
  if (bytes >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return false;
  }

  // UTF-16 LE BOM
  if (bytes >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return false;
  }

  for (let i = 0; i < totalBytes; i++) {
    if (buf[i] === 0) {
      // NULL byte--it's binary!
      return true;
    } else if ((buf[i] < 7 || buf[i] > 14) && (buf[i] < 32 || buf[i] > 127)) {
      // UTF-8 detection
      if (buf[i] > 193 && buf[i] < 224 && i + 1 < totalBytes) {
        i++;
        if (buf[i] > 127 && buf[i] < 192) {
          continue;
        }
      } else if (buf[i] > 223 && buf[i] < 240 && i + 2 < totalBytes) {
        i++;
        if (buf[i] > 127 && buf[i] < 192 && buf[i + 1] > 127 && buf[i + 1] < 192) {
          i++;
          continue;
        }
      }

      suspiciousBytes++;
      // Read at least 32 buf before making a decision
      if (i > 32 && (suspiciousBytes * 100) / totalBytes > 10) {
        return true;
      }
    }
  }

  if ((suspiciousBytes * 100) / totalBytes > 10) {
    return true;
  }

  return false;
}

function mkdirp(p) {
  if (!fs.existsSync(p)) {
    mkdirp(path.dirname(p));
    fs.mkdirSync(p);
  }
}

function copyWithReplace(src, dest, replacements) {
  mkdirp(path.dirname(dest));
  if (!isBinary(src)) {
    let content = fs.readFileSync(src, {encoding: 'utf-8'});
    replacements.forEach(r => {
      const [regexp, newvalue] = r;
      content = content.replace(regexp, newvalue);
    });
    fs.writeFileSync(dest, content);
  } else {
    fs.copyFileSync(src, dest);
  }
}

function unquoteArgs(s) {
  return s.replace(/^'(.*)'$/, '$1');
}

function main(args) {
  args = fs.readFileSync(args[0], {encoding: 'utf-8'}).split('\n').map(unquoteArgs);
  const
      [outDir, baseDir, srcsArg, binDir, genDir, depsArg, packagesArg, replacementsArg, packPath,
       publishPath, stampFile] = args;

  const replacements = [
    // Strip content between BEGIN-INTERNAL / END-INTERNAL comments
    [/(#|\/\/)\s+BEGIN-INTERNAL[\w\W]+?END-INTERNAL/g, ''],
  ];
  let version = '0.0.0';
  if (stampFile) {
    // The stamp file is expected to look like
    // BUILD_SCM_HASH 83c699db39cfd74526cdf9bebb75aa6f122908bb
    // BUILD_SCM_LOCAL_CHANGES true
    // BUILD_SCM_VERSION 6.0.0-beta.6+12.sha-83c699d.with-local-changes
    // BUILD_TIMESTAMP 1520021990506
    //
    // We want version to be the 6.0.0-beta... part
    const versionTag = fs.readFileSync(stampFile, {encoding: 'utf-8'})
                           .split('\n')
                           .find(s => s.startsWith('BUILD_SCM_VERSION'));
    // Don't assume BUILD_SCM_VERSION exists
    if (versionTag) {
      version = versionTag.split(' ')[1].trim();
    }
  }
  replacements.push([/0.0.0-PLACEHOLDER/g, version]);
  const rawReplacements = JSON.parse(replacementsArg);
  for (let key of Object.keys(rawReplacements)) {
    replacements.push([new RegExp(key, 'g'), rawReplacements[key]])
  }

  // src like baseDir/my/path is just copied to outDir/my/path
  for (src of srcsArg.split(',').filter(s => !!s)) {
    copyWithReplace(src, path.join(outDir, path.relative(baseDir, src)), replacements);
  }

  function outPath(f) {
    let rootDir;
    if (!path.relative(binDir, f).startsWith('..')) {
      rootDir = binDir;
    } else if (!path.relative(genDir, f).startsWith('..')) {
      rootDir = genDir;
    } else {
      // It might be nice to enforce here that deps don't contain sources
      // since those belong in srcs above.
      // The `deps` attribute should typically be outputs of other rules.
      // However, things like .d.ts sources of a ts_library or data attributes
      // of ts_library will result in source files that appear in the deps
      // so we have to allow this.
      rootDir = '.';
    }
    return path.join(outDir, path.relative(path.join(rootDir, baseDir), f));
  }

  // deps like bazel-bin/baseDir/my/path is copied to outDir/my/path
  // Don't include external directories in the package, these should be installed
  // by users outside of the package.
  for (dep of depsArg.split(',').filter(s => !!s && !s.startsWith('external/'))) {
    try {
      copyWithReplace(dep, outPath(dep), replacements);
    } catch (e) {
      console.error(`Failed to copy ${dep} to ${outPath(dep)}`);
      throw e;
    }
  }

  for (dep of depsArg.split(',').filter(s => !!s)) {
    
  }

  // package contents like bazel-bin/baseDir/my/directory/* is
  // recursively copied to outDir/my/*
  for (pkg of packagesArg.split(',').filter(s => !!s)) {
    const outDir = outPath(path.dirname(pkg));
    function copyRecursive(base, file) {
      if (fs.lstatSync(path.join(base, file)).isDirectory()) {
        const files = fs.readdirSync(path.join(base, file));
        files.forEach(f => {
          copyRecursive(base, path.join(file, f));
        });
      } else {
        copyWithReplace(path.join(base, file), path.join(outDir, file), replacements);
      }
    }
    fs.readdirSync(pkg).forEach(f => {
      copyRecursive(pkg, f);
    });
  }

  const npmTemplate =
      fs.readFileSync(require.resolve('nodejs/run_npm.sh.template'), {encoding: 'utf-8'});
  // Resolve the outDir to an absolute path so it doesn't depend on Bazel's bazel-out symlink
  fs.writeFileSync(packPath, npmTemplate.replace('TMPL_args', `pack "${path.resolve(outDir)}"`));
  fs.writeFileSync(publishPath, npmTemplate.replace('TMPL_args', `publish "${path.resolve(outDir)}"`));
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
