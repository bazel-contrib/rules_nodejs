/// <amd-module name="examples_webtesting/decrement.spec"/>
import {decrement} from 'decrement-lib/decrement';

describe('decrementing', () => {
  it('should do that', () => {
    expect(decrement(1)).toBe(0);
  });
});
