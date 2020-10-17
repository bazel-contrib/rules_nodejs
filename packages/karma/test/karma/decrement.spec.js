(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define(
      'rules_nodejs/packages/karma/test/karma/decrement.spec',
      ['require', 'exports', 'rules_nodejs/packages/karma/test/karma/decrement'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
var decrement_1 = require('rules_nodejs/packages/karma/test/karma/decrement');
describe('decrementing', function() {
  it('should do that', function() {
    expect(decrement_1.decrement(1)).toBe(0);
  });
});
});
