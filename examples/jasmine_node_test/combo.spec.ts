import {decrement} from './decrement';
const {increment} = require('./increment');

describe('a combo', () => {
  it('should increment', () => {
    expect(increment(1)).toBe(2);
  });

  it('should decrement', () => {
    expect(decrement(2)).toBe(1);
  });
});

