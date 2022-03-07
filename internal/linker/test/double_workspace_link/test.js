const npm = require("npm");

describe("linker", () => {
  it("should load the same copy of a npm dep when link_workspace_root is True and loading from workspace root path", () => {
    const foo = require("build_bazel_rules_nodejs/internal/linker/test/double_workspace_link/foo");
    expect(foo.foo_npm === npm).toBe(true, "Expected foo_npm to be npm");
  });

  it("should load the same copy of a npm dep when link_workspace_root is True and loading from relative path", () => {
    const bar = require("./bar");
    expect(bar.bar_npm === npm).toBe(true, "Expected bar_npm to be npm");
  });
});
