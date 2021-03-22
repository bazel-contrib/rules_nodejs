const { stat } = require("fs");
const path = require("path");

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const locationBase = "build_bazel_rules_nodejs/packages/esbuild/test/css/";

const cssExpected = helper.resolve(path.join(locationBase, "with_css.css"));

describe("esbuild css", () => {
  it("no css by default", () => {
    expect(() =>
      helper.resolve(path.join(locationBase, "default.css"))
    ).toThrow();
  });

  it("css if requested", () => {
    stat(cssExpected, (err, stats) => {
      expect(err).toBeNull();
    });
  });
});
