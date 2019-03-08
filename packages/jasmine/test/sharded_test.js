describe('test sharding with explicit isolation failures', () => {
  let testIsolationFailure = 0;
  it('should run the first spec first', () => {
    testIsolationFailure = 1;
    expect(true).toBe(true);
  });
  it('should run the second spec in the same shard with the first', () => {
    expect(testIsolationFailure).toBe(1);
  });
  it('should run the third spec in a separate shard, first', () => {
    expect(testIsolationFailure).toBe(0);
    testIsolationFailure = 2;
    expect(true).toBe(true);
  });
  it('should run the fourth spec in the same shard with the third', () => {
    expect(testIsolationFailure).toBe(2);
  });
  it('should run the fifth spec in a third shard, first', () => {
    expect(testIsolationFailure).toBe(0);
    testIsolationFailure = 3;
    expect(true).toBe(true);
  });
  it('should run the sixth spec in the same shard with the fifth', () => {
    expect(testIsolationFailure).toBe(3);
  });
});
