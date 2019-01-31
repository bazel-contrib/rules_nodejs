(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define(
      'npm_packages_karma_e2e/decrement.spec',
      ['require', 'exports', 'npm_packages_karma_e2e/decrement'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
var decrement_1 = require('npm_packages_karma_e2e/decrement');
describe('decrementing', function() {
  it('should do that', function() {
    expect(decrement_1.decrement(1)).toBe(0);
  });
});
});
