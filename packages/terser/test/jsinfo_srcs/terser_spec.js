/**
 * @fileoverview Description of this file.
 */
const fs = require('fs');
const DIR = 'build_bazel_rules_nodejs/packages/terser/test/jsinfo_srcs';

describe('JSModuleInfo provider in the srcs', () => {
  it('should produce the esnext as the default output', () => {
    const file = require.resolve(DIR + '/terser.js');
    expect(fs.readFileSync(file, 'utf-8')).toBe('import*as dep from"./dep";')
  });
  it('should output a JSModuleInfo provider if one is input', () => {
    const esnextFile = require.resolve(DIR + '/out.mjs');
    expect(fs.readFileSync(esnextFile, 'utf-8')).toBe('import*as dep from"./dep";');
    const namedFile = require.resolve(DIR + '/out.umd.js');
    expect(fs.readFileSync(namedFile, 'utf-8'))
        .toBe(
            '!function(e){if("object"==typeof module&&"object"==typeof module.exports){var o=e(require,exports);void 0!==o&&(module.exports=o)}else"function"==typeof define&&define.amd&&define("some_module_name",["require","exports","./dep"],e)}(function(e,o){"use strict";Object.defineProperty(o,"__esModule",{value:!0}),e("./dep")});');
  });
});
