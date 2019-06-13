/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @fileoverview These named-UMD shims provide named UMD modules for deep rxjs 6
 * imports such as `rxjs/operators` so that we can bundle an application that
 * depends on rxjs 6 using the concatjs bundlers in ts_devserver & ts_web_test.
 * To use, add `@build_bazel_rules_nodejs//umd_shims:rxjs-shims.umd.js` to `ts_devserver`
 * `scripts` or `ts_web_test` `deps`.
 */

// rxjs/ajax
(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('rxjs/ajax', ['exports', 'rxjs'], factory);
}
})(function(exports, rxjs) {
'use strict';
Object.keys(rxjs.ajax).forEach(function(key) {
  exports[key] = rxjs.ajax[key];
});
Object.defineProperty(exports, '__esModule', {value: true});
});

// rxjs/fetch
(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('rxjs/fetch', ['exports', 'rxjs'], factory);
}
})(function(exports, rxjs) {
'use strict';
Object.keys(rxjs.fetch).forEach(function(key) {
  exports[key] = rxjs.fetch[key];
});
Object.defineProperty(exports, '__esModule', {value: true});
});

// rxjs/operators
(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('rxjs/operators', ['exports', 'rxjs'], factory);
}
})(function(exports, rxjs) {
'use strict';
Object.keys(rxjs.operators).forEach(function(key) {
  exports[key] = rxjs.operators[key];
});
Object.defineProperty(exports, '__esModule', {value: true});
});

// rxjs/testing
(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('rxjs/testing', ['exports', 'rxjs'], factory);
}
})(function(exports, rxjs) {
'use strict';
Object.keys(rxjs.testing).forEach(function(key) {
  exports[key] = rxjs.testing[key];
});
Object.defineProperty(exports, '__esModule', {value: true});
});

// rxjs/webSocket
(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('rxjs/webSocket', ['exports', 'rxjs'], factory);
}
})(function(exports, rxjs) {
'use strict';
Object.keys(rxjs.webSocket).forEach(function(key) {
  exports[key] = rxjs.webSocket[key];
});
Object.defineProperty(exports, '__esModule', {value: true});
});
