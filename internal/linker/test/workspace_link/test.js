describe('linker', () => {
  it('should be able to require by absolute path when link_workspace_root is True', () => {
    const foo = require('build_bazel_rules_nodejs/internal/linker/test/workspace_link/foo');
    expect(foo.foo).toBe('foo');
    const bar = require('build_bazel_rules_nodejs/internal/linker/test/workspace_link/bar');
    expect(bar.bar).toBe('bar');
  });
});
