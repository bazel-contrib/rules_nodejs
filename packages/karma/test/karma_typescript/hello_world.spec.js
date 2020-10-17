(function (factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
      var v = factory(require, exports);
      if (v !== undefined) module.exports = v;
  }
  else if (typeof define === "function" && define.amd) {
    define(
        'rules_nodejs/packages/karma/test/karma_typescript/hello_world.spec',
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
