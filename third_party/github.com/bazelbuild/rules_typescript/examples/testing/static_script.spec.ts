const someGlobal = new Promise<string>((resolve, reject) => {
  const script = document.createElement('script');
  script.src = `base/build_bazel_rules_typescript/examples/testing/static_script.js`;
  script.onerror = reject;
  script.onload = () => {
    document.body.removeChild(script);
    resolve((window as any).someGlobal);
  };
  document.body.appendChild(script);
});

describe('static script', () => {
  it('should load', async () => {
    expect(await someGlobal).toBe("someGlobalValue");
  });
});

// at least one import or export is needed for this file to
// be compiled into an named-UMD module by typescript
export {};
