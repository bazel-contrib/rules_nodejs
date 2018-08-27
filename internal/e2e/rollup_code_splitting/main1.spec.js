const expected = 'dep1 fn,lib2 fn,dep2 fn';

describe('bundling main entry point', () => {
  it('bundle.cs.es6 should work', () => {
    const main1 = require('./bundle.cs.es6/main1.js')
    const actual = (new main1()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs should work', () => {
    const main1 = require('./bundle.cs/main1.js')
    const actual = (new main1()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs.min should work', () => {
    const main1 = require('./bundle.cs.min/main1.js')
    const actual = (new main1()).test();
    expect(actual).toEqual(expected);
  });

  it('bundle.cs.min_debug should work', () => {
    const main1 = require('./bundle.cs.min_debug/main1.js')
    const actual = (new main1()).test();
    expect(actual).toEqual(expected);
  });
});