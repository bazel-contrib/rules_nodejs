(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('e2e_karma/decrement.spec', ['require', 'exports', 'e2e_karma/decrement'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
var decrement_1 = require('e2e_karma/decrement');
describe('decrementing', function() {
  it('should do that', function() {
    expect(decrement_1.decrement(1)).toBe(0);
  });
});
});
