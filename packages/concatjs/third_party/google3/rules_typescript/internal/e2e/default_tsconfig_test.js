/**
 * @fileoverview
 * This tests interactions between multiple Bazel workspaces.
 *
 * We have learned from experience in the rules_nodejs repo that it's not
 * practical to simply check in the nested WORKSPACE files and try to build
 * them, because
 * - it's hard to exclude them from the parent WORKSPACE - each nested workspace
 *   must be registered there with a matching name
 * - testing a child workspace requires `cd` into the directory, which doesn't
 *   fit the CI model of `bazel test ...`
 *
 * The test is written in JavaScript simply to make it more portable, so we can
 * run it on Windows for example. We don't use TypeScript here since we are
 * running outside the build system.
 */

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const os = require('os');

const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'wksp'));
const WORKSPACE_BOILERPLATE = `
http_archive(
    name = "build_bazel_rules_nodejs",
    urls = ["https://github.com/bazelbuild/rules_nodejs/archive/0.11.2.zip"],
    strip_prefix = "rules_nodejs-0.11.2",
    sha256 = "c00d5381adeefb56e0ef959a7b168cae628535dab933cfad1c2cd1870cd7c9de"
)
http_archive(
    name = "bazel_skylib",
    urls = ["https://github.com/bazelbuild/bazel-skylib/archive/0.3.1.zip"],
    strip_prefix = "bazel-skylib-0.3.1",
    sha256 = "95518adafc9a2b656667bbf517a952e54ce7f350779d0dd95133db4eb5c27fb1",
)
http_archive(
    name = "io_bazel_skydoc",
    urls = ["https://github.com/bazelbuild/skydoc/archive/0ef7695c9d70084946a3e99b89ad5a99ede79580.zip"],
    strip_prefix = "skydoc-0ef7695c9d70084946a3e99b89ad5a99ede79580",
    sha256 = "491f9e142b870b18a0ec8eb3d66636eeceabe5f0c73025706c86f91a1a2acb4d",
)
http_archive(
    name = "io_bazel_rules_webtesting",
    urls = ["https://github.com/bazelbuild/rules_webtesting/archive/v0.2.0.zip"],
    strip_prefix = "rules_webtesting-0.2.0",
    sha256 = "cecc12f07e95740750a40d38e8b14b76fefa1551bef9332cb432d564d693723c",
)
http_archive(
    name = "io_bazel_rules_go",
    urls = [
        "http://mirror.bazel.build/github.com/bazelbuild/rules_go/releases/download/0.10.3/rules_go-0.10.3.tar.gz",
        "https://github.com/bazelbuild/rules_go/releases/download/0.10.3/rules_go-0.10.3.tar.gz"
    ],
    sha256 = "feba3278c13cde8d67e341a837f69a029f698d7a27ddbb2a202be7a10b22142a",
)
local_repository(
    name = "build_bazel_rules_typescript",
    path = "${process.cwd()}",
)
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")
node_repositories(package_json=[])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")
ts_setup_workspace()
`;

/**
 * Create a file at path filename, creating parent directories as needed, under
 * this test's temp directory. Write the content into that file.
 */
function write(filename, content) {
  var parents = path.dirname(path.join(tmpdir, filename));
  while (path.dirname(parents) !== parents) {
    if (!fs.existsSync(path.join(parents))) {
      fs.mkdirSync(path.join(parents));
    }
    parents = path.dirname(parents);
  }
  fs.writeFileSync(path.join(tmpdir, filename), content);
}

function bazel(workspace, args) {
  const result = child_process.spawnSync('bazel', args, {
    cwd: path.join(tmpdir, workspace),
    stdio: 'inherit',
  });
  expect(result.status).toBe(0, 'bazel exited with non-zero exit code');
}

describe('default tsconfig', () => {
  it(`uses the tsconfig in the workspace defining the rule,
        not the workspace where the rule is defined (rules_typescript), nor
        the workspace where the build is occurring`,
     () => {
       // Workspace 'a' can't compile with --noImplicitAny.
       // When workspace 'b' has a dep here, we make sure not to use the
       // tsconfig from workspace 'b'
       write('a/WORKSPACE', `
workspace(name = "a")
${WORKSPACE_BOILERPLATE}`);
       write('a/BUILD', `
alias(name = "node_modules", actual = "@build_bazel_rules_typescript//:node_modules", visibility=["//visibility:public"])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
ts_library(
    name = "a_lib",
    srcs=["has_implicit_any.ts"],
    node_modules = "@build_bazel_rules_typescript_tsc_wrapped_deps//:node_modules",
    visibility = ["//visibility:public"],
)
        `);
       write('a/tsconfig.json', `{}`);
       write('a/has_implicit_any.ts', `function f(a) {
            console.error(a);
        }`);

       // Workspace 'b' has a default tsconfig that sets --noImplicitAny.
       write('b/WORKSPACE', `
workspace(name="b")
local_repository(name="a", path="../a")
${WORKSPACE_BOILERPLATE}`);
       write('b/BUILD', `
alias(name = "node_modules", actual = "@build_bazel_rules_typescript//:node_modules", visibility=["//visibility:public"])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
exports_files(["tsconfig.json"])
ts_library(
    name = "b_lib",
    srcs = ["file.ts"],
    deps = ["@a//:a_lib"],
    node_modules = "@build_bazel_rules_typescript_tsc_wrapped_deps//:node_modules",
)
        `);
       write('b/file.ts', `
        f('thing');
        `);
       write('b/tsconfig.json', `{
            "compilerOptions": {
                "noImplicitAny": true
            }
        }`);

       // Now build from workspace 'b' and verify that the dep in workspace 'a'
       // was able to compile.
       bazel('b', ['build', ':all']);
     });
});
