(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define(
      'build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/decrement.spec',
      ['require', 'exports', 'build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/decrement'],
      factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
var decrement_1 = require('build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/decrement');
describe('decrementing', function() {
  it('should do that', function() {
    expect(decrement_1.decrement(1)).toBe(0);
  });
});
});
