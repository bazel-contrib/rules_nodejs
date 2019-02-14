describe('jasmine_shared_env_test', () => {
  it('global.foobar should be 1', () => {
    expect(global.foobar).toBe(1);
  });
  it('afterEach should have run and global.foobar should now be 2', () => {
    expect(global.foobar).toBe(2);
  });
  it('afterEach should have run and global.foobar should now be 3', () => {
    expect(global.foobar).toBe(3);
  });
  it('should have the jasmine zone patch applies', () => {
    expect(global.jasmine['__zone_patch__']).toBe(true);
  })
});
