(function (factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
      var v = factory(require, exports);
      if (v !== undefined) module.exports = v;
  }
  else if (typeof define === "function" && define.amd) {
    define(
        'build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma_typescript/hello_world.spec',
        ['require', 'exports'], factory);
  }
})(function (require, exports) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  describe('hello', () => {
      it('should be a global variable', () => {
          expect(window.hello).toBe('world');
      });
  });
});
