const exportedTest1 = 'dep1 fn,lib2 fn,dep2 fn';
const exportedTest2 = 'dep4 fn';

describe('bundling main entry point', () => {
  it('bundle.cs.es6 should work', async () => {
    const main1 = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.es6/main1.js')
    expect(main1.test()).toEqual(exportedTest1);
    const actualTest2 = await main1.test2();
    expect(actualTest2).toEqual(exportedTest2);
  });

  it('bundle.cs should work', async () => {
    const main1 =
        require('build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs/main1.js')
    expect(main1.test()).toEqual(exportedTest1);
    const actualTest2 = await main1.test2();
    expect(actualTest2).toEqual(exportedTest2);
  });

  it('bundle.cs.min should work', async () => {
    const main1 = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.min/main1.js')
    expect(main1.test()).toEqual(exportedTest1);
    const actualTest2 = await main1.test2();
    expect(actualTest2).toEqual(exportedTest2);
  });

  it('bundle.cs.min_debug should work', async () => {
    const main1 = require(
        'build_bazel_rules_nodejs/internal/e2e/rollup_code_splitting/bundle.cs.min_debug/main1.js')
    expect(main1.test()).toEqual(exportedTest1);
    const actualTest2 = await main1.test2();
    expect(actualTest2).toEqual(exportedTest2);
  });
});