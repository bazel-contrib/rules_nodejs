#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findBazelFiles(dir) {
  if (!fs.existsSync(dir)) {
    // Fail-safe
    return [];
  }
  return fs.readdirSync(dir).reduce((files, file) => {
    const fullPath = path.posix.join(dir, file);
    let isSymbolicLink;
    try {
      isSymbolicLink = fs.lstatSync(fullPath).isSymbolicLink();
    } catch (e) {
      // If an optional dependency failed to install it is possible that readdirSync will
      // return a folder name that no longer exists and lstatSync will throw with an error such as
      // `Error: ENOENT: no such file or directory, lstat
      // '/private/var/folders/0l/nj_q9kzj49gdz1w6f5v9tw3h0000gn/T/tmp-49206kt9HWV3A8daE/node_modules/fsevents'`
      // This seems to be because yarn does parallel installs and runs parallel step.
      return files;
    }
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      if (isSymbolicLink) {
        // Filter out broken symbolic links. These cause fs.statSync(fullPath)
        // to fail with `ENOENT: no such file or directory ...`
        return files;
      }
      throw e;
    }
    const isDirectory = stat.isDirectory();
    if (isDirectory && isSymbolicLink) {
      // Filter out symbolic links to directories. An issue in yarn versions
      // older than 1.12.1 creates symbolic links to folders in the .bin folder
      // which leads to Bazel targets that cross package boundaries.
      // See https://github.com/bazelbuild/rules_nodejs/issues/428 and
      // https://github.com/bazelbuild/rules_nodejs/issues/438.
      // This is tested in /e2e/fine_grained_symlinks.
      return files;
    }
    if (isDirectory) {
      return files.concat(findBazelFiles(fullPath));
    } else {
      const fileUc = file.toUpperCase();
      if (fileUc == 'BUILD' || fileUc == 'BUILD.BAZEL') {
        return files.concat(fullPath);
      }
      return files;
    }
  }, []);
}

function main() {
  // Rename all bazel files found by prefixing them with `_`
  const cwd = process.cwd();
  const rootNodeModules =
      /\/node_modules\/@bazel\/hide-bazel-files$/.test(cwd.replace(/\\/g, '/')) ?
      path.dirname(path.dirname(cwd)) :
      path.posix.join(cwd, 'node_modules');
  for (f of findBazelFiles(rootNodeModules)) {
    const d = path.posix.join(path.dirname(f), `_${path.basename(f)}`);
    fs.renameSync(f, d);
  }
  return 0;
}

module.exports = {main};

if (require.main === module) {
  process.exitCode = main();
}
