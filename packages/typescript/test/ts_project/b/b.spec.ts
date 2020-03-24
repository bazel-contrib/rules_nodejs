import {sayHello} from './b';

describe('b', () => {
  it('should say hello', () => {
    let captured: string = '';
    console.log = (s: string) => captured = s;
    sayHello(' world');
    expect(captured).toBe('hello world');
  });
  it('should include byte-order mark since that was passed in args attr', () => {
    expect(require('fs').readFileSync(require.resolve('./b'), 'utf-8')[0]).toBe('\ufeff');
  });
});
