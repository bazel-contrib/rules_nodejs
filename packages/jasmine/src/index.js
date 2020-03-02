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

let JUnitXmlReporter = null;
try {
  JUnitXmlReporter = require('jasmine-reporters').JUnitXmlReporter;
} catch (err) {
  // fail quietly if jasmine-reporters is not available
}
exports.JUnitXmlReporter = JUnitXmlReporter;
