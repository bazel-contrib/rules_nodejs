const { readFileSync } = require("fs");
const path = require("path");

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const locationBase = "build_bazel_rules_nodejs/packages/esbuild/test/css/";

const cssExpected = helper.resolve(path.join(locationBase, "with_css.css"));

describe("esbuild css", () => {
  it("no css by default", () => {
    if (process.platform === "win32") {
      // Windows has no sandbox, and the runfiles helper will return files
      // that happen to exist in the folder, even if they are not declared outputs
      return;
    }
    expect(() =>
      helper.resolve(path.join(locationBase, "default.css"))
    ).toThrow();
  });

  it("css if requested", () => {
    const contents = readFileSync(cssExpected, { encoding: "utf8" });
    expect(contents).toContain("external-content");
  });
});
