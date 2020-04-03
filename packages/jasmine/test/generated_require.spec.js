describe('output tree spec resolves', () => {
  it('should resolve runfiles relative', () => {
    try {
      const json = require('./test.json');
      // Expected to fail on Windows because a relative require from
      // the output tree to the source tree will not work unless the spec
      // is run from the correct spot. But without the fix in
      // #1796, the spec is run incorrectly from
      // external\npm\node_modules\build_bazel_rules_nodejs\packages\jasmine\test\generated.spec.js
      // ```
      // ==================== Test output for //packages/jasmine/test:generated_require_spec_test:
      // Randomized with seed 77827
      // Started
      // C:\b\t2skj56o\external\npm\node_modules\build_bazel_rules_nodejs\packages\jasmine\test\generated.spec.js
      // Failures:
      // 1) output tree spec resolves should resolve runfiles relative
      //   Message:
      //     Failed: './test.json' should be resolved
      //   Stack:
      //     Error: Failed: './test.json' should be resolved
      //         at <Jasmine>
      //         at UserContext.<anonymous>
      //         (C:\b\t2skj56o\external\npm\node_modules\build_bazel_rules_nodejs\packages\jasmine\test\generated.spec.js:8:7)
      //         at <Jasmine>
      //         at processImmediate (internal/timers.js:439:21)
      // 1 spec, 1 failure
      // Finished in 0.011 seconds
      // Randomized with seed 77827 (jasmine --random=true --seed=77827)
      // ```
      expect(json.foo).toBe('bar');
    } catch (_) {
      fail(`'./test.json' should be resolved`);
    }
  });
});
