define('build_bazel_rules_nodejs/packages/concatjs/web_test/test/karma/test-initialized.spec', [], () => {
  // Test that ensures that the "init-test.js" file has been included in the
  // ConcatJS module and was actually executed by the browser. The "init-test.js"
  // file is included in "static_files" and in the "deps" but should not be treated
  // as static file as it is specified as dependency.
  describe('Test initialization', () => {

    it('should have initialized tests', () => {
      expect(window['__testInitialized']).toBe(true);
    });
  });
});
