(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('rules_nodejs/packages/karma/test/karma/decrement', ['require', 'exports'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
function decrement(n) {
  return n - 1;
}
exports.decrement = decrement;
});
