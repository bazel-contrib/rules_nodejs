import {throws, sayHello} from './hello';

describe('multiple stack frames', () => {
  it('failing test', () => {
    expect(sayHello()).toBe('World');
  });

  it('another failing test', () => {
    expect(throws()).toBe('something');
  });
});
