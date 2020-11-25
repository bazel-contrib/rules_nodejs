// This dummy export ensures that this file is compiled as a module instead
// of a script.
export {};

describe('stack trace', () => {
  it('failing test', () => {
    expect(true).toBe(false);
  });
});
