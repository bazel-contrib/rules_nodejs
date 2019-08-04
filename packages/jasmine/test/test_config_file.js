describe('configuring Jasmine', () => {
  it('should accept a config file', () => {
    // the config_file.json has random: false
    expect(jasmine.getEnv().configuration().random).toBeFalsy();
  });
});