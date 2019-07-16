const jasmineCore = require('jasmine-core');

// a boot function for use in user bootstrap code:
// require('@bazel/jasmine').boot()
function boot() {
  jasmineCore.boot(jasmineCore);
}
exports.boot = boot;

// re-export jasmine and its transitive dep jasmine-core
exports.jasmine = require('jasmine');
exports.jasmineCore = jasmineCore;
