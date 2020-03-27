describe('args', () => {
  it('should pass through other templated_args', async () => {
    // args that are not consumed by the node launcher should be passed through
    // to the spec
    expect(process.argv.slice(2)).toEqual(['arg1', 'arg2', 'arg3']);
  });

  it('should apply --node_options in templated_args', async () => {
    // without --node_options=--experimental-modules this will fail
    const dynamicImport = await import('./dynamic_import.js');
    dynamicImport.default.hello();
  });
});
