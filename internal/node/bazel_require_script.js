// Adapt node programs to run under Bazel
// Meant to be run in a --require hook

if(global.BAZEL_NODE_PATCHES) {
  return;
}
global.BAZEL_NODE_PATCHES = true;




const fs = require('fs');
const path = require('path');
const orig = {};
// TODO: more functions need patched like
// the async and native versions
orig['realPathSync'] = fs.realpathSync;
orig['lstatSync'] = fs.lstatSync;

// To fully resolve a symlink requires recursively
// following symlinks until the target is a file
// rather than a symlink, so we must make this look
// like a file.
function lstatSync(p) {
  const result = orig.lstatSync(p);
  result.isSymbolicLink = () => false;
  result.isFile = () => true;
  return result;
}

function realpathSync(...s) {
  // Realpath returns an absolute path, so we should too
  return path.resolve(s[0]);
}

function monkeypatch() {
  fs.realpathSync = realpathSync;
  fs.lstatSync = lstatSync;
}

function unmonkeypatch() {
  fs.realpathSync = orig.realPathSync;
  fs.lstatSync = orig.lstatSync;
}

monkeypatch();
