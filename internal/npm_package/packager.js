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
       publishPath, replaceWithVersion, stampFile, vendorExternalArg] = args;

  const replacements = [
    // Strip content between BEGIN-INTERNAL / END-INTERNAL comments
    [/(#|\/\/)\s+BEGIN-INTERNAL[\w\W]+?END-INTERNAL/g, ''],
  ];
  if (replaceWithVersion) {
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
    replacements.push([new RegExp(replaceWithVersion, 'g'), version]);
  }
  const rawReplacements = JSON.parse(replacementsArg);
  for (let key of Object.keys(rawReplacements)) {
    replacements.push([new RegExp(key, 'g'), rawReplacements[key]])
  }

  // src like baseDir/my/path is just copied to outDir/my/path
  for (src of srcsArg.split(',').filter(s => !!s)) {
    copyWithReplace(src, path.join(outDir, path.relative(baseDir, src)), replacements);
  }

  function outPath(f) {
    function findRoot() {
      for (ext of vendorExternalArg.split(',').filter(s => !!s)) {
        const candidate = path.join(binDir, 'external', ext);
        if (!path.relative(candidate, f).startsWith('..')) {
          return candidate;
        }
      }
      if (!path.relative(binDir, f).startsWith('..')) {
        return binDir;
      } else if (!path.relative(genDir, f).startsWith('..')) {
        return genDir;
      } else {
        // It might be nice to enforce here that deps don't contain sources
        // since those belong in srcs above.
        // The `deps` attribute should typically be outputs of other rules.
        // However, things like .d.ts sources of a ts_library or data attributes
        // of ts_library will result in source files that appear in the deps
        // so we have to allow this.
        return '.';
      }
    }
    return path.join(outDir, path.relative(path.join(findRoot(), baseDir), f));
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
        function outFile() {
          for (ext of vendorExternalArg.split(',').filter(s => !!s)) {
            if (file.startsWith(`external/${ext}`)) {
              return file.substr(`external/${ext}`.length);
            }
          }
          return file;
        }
        copyWithReplace(path.join(base, file), path.join(outDir, outFile()), replacements);
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
