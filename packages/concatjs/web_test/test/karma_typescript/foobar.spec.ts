describe('foo', () => {
  it('should be a global variable', () => {
    expect((window as any).foo).toBe('bar');
  });
});

// no-op export statement to make this file a typescript module.
export {};
