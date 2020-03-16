import {sayHello} from './b';

describe('b', () => {
  it('should say hello', () => {
    let captured: string = '';
    console.log = (s: string) => captured = s;
    sayHello(' world');
    expect(captured).toBe('hello world');
  });
});
