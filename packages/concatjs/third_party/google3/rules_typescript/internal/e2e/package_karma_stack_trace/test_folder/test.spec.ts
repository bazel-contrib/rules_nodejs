import { sayHello, error } from "./hello";

describe('multiple stack frames', () => {
  it('failing test', () => {
    expect(sayHello()).toBe('World');
  });

  it('another failing test', () => {
    expect(error()).toBe(null);
  });
});
