describe('args', () => {
  it('should pass through templated_args', async () => {
    // without --node_options=--experimental-modules this will fail
    const dynamicImport = await import('./dynamic_import.js');
    dynamicImport.default.hello();
  });
});
