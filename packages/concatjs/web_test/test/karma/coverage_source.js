(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define(
      'build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/coverage_source',
      ['require', 'exports'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
function isString(input) {
  if (typeof input === 'string') {
    return true;
  } else {
    return false;
  }
}
exports.isString = isString;
});