// Try unhoisted location of `jasmine-core` which is a transitive dep of `jasmine`.
// Try this first so that we don't accidentally fall through to the user's
// `jasmine-core`. This file will be under `node_modules/@bazel/jasmine/index.js`.
// `jasmine` is a direct dependency of `@bazel/jasmine` so
// require `jasmine` will get the correct version of `jasmine`, however,
// `jasmine-core` is a transitive dep of `jasmine` so we need to look in the
// unhoisted location first to guarantee we will get the correct `jasmine-core`
// which our version of `jasmine` depends on.
let jasmineCore;
try {
  // Look under `node_modules/@bazel/jasmine/node_modules/jasmine/node_modules/jasmine-core`
  jasmineCore = require('jasmine/node_modules/jasmine-core');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    // rethrow other errors
    throw e;
  }
  // Look under `node_modules/@bazel/jasmine/node_modules/jasmine-core` and
  // falls back to `node_modules/jasmine-core` if not found there.
  jasmineCore = require('jasmine-core');
}

// a boot function for use in user bootstrap code:
// require('@bazel/jasmine').boot()
function boot() {
  jasmineCore.boot(jasmineCore);
}
exports.boot = boot;

// re-export jasmine and its transitive dep jasmine-core
exports.jasmine = require('jasmine');
exports.jasmineCore = jasmineCore;
