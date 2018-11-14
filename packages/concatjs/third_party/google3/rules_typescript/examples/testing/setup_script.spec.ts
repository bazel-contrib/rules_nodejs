describe('setup script', () => {
  it('should load before the spec', async () => {
    expect((window as any).setupGlobal).toBe("setupGlobalValue");
  });
});

// at least one import or export is needed for this file to
// be compiled into an named-UMD module by typescript
export {};
