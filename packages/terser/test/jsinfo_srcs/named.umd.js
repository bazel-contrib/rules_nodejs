(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('some_module_name', ['require', 'exports', './dep'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const dep = require('./dep');
});
