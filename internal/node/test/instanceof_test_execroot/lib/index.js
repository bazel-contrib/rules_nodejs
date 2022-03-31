// This file will fail when one dependency is resolved from two distinct node_modules
// mostly likely to be one inside runfiles and other from bazel-out
// See: https://github.com/bazelbuild/rules_nodejs/pull/3380 for more.
const assert = require("assert");

const resolved_by_lib = require.resolve("node_resolve_main");
const resolved_by_pkg_with_bin = globalThis["node_resolve_main_resolved_path_by_pkg_with_bin"]
assert.equal(
    resolved_by_lib, 
    resolved_by_pkg_with_bin,
    `
Expected to resolve package "node_resolve_main" from the same node_modules but

tools/npm_packages/pkg_with_bin resolved it from ${resolved_by_pkg_with_bin}

internal/node/test/instanceof_test_execroot/lib resolved it from ${resolved_by_lib}

See: https://github.com/bazelbuild/rules_nodejs/pull/3380 for context.
`
);