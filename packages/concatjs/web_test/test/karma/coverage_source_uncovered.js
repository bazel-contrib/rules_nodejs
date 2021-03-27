(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define(
      'build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/coverage_source_uncovered',
      ['require', 'exports'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
// noting in  this file should be required, so we can test the c8 feature all: true
// which will pick up files that aren't directly referenced by test files
// but are added to coverage as empty coverage
function notCalled(input) {
  return input * 13;
}
exports.notCalled = notCalled;
});