let globalFoobars = [];
describe('jasmine_shared_env_test', () => {
  it('global.foobar should change', () => {
    expect(globalFoobars.includes(global.foobar)).toBe(false);
    globalFoobars.push(global.foobar);
  });
  it('global.foobar should change again', () => {
    expect(globalFoobars.includes(global.foobar)).toBe(false);
    globalFoobars.push(global.foobar);
  });
  it('global.foobar should change again again', () => {
    expect(globalFoobars.includes(global.foobar)).toBe(false);
    globalFoobars.push(global.foobar);
  });
  it('should have the jasmine zone patch applies', () => {
    expect(global.jasmine['__zone_patch__']).toBe(true);
  })
});
