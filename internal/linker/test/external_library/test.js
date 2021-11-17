describe('linker', () => {
  it('should properly link external js library ', async () => {
    const {SomeConstant} = await import('internal_linker_external_library_wksp/index.mjs');
    expect(SomeConstant).toBe('Hello!');
  });
});
