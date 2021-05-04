(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define(
      'build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/coverage.spec',
      [
        'require', 'exports',
        'build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/coverage_source'
      ],
      factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
var coverage_source_1 =
    require('build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/coverage_source');
describe('coverage function', () => {
  it('should cover one branch', () => {
    expect(coverage_source_1.isString(2)).toBe(false);
  });
  it('should cover the other branch', () => {
    expect(coverage_source_1.isString('some string')).toBe(true);
  });
});
});
