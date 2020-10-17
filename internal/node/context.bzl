"node_context_data rule"

load("@rules_nodejs//:providers.bzl", "NodeContextInfo")

_DOC = """node_context_data gathers information about the build configuration.
It is a common dependency of all targets that are sensitive to configuration.
(currently pkg_npm, pkg_web, and rollup_bundle)"""

def _impl(ctx):
    return [NodeContextInfo(stamp = ctx.attr.stamp)]

# Modelled after go_context_data in rules_go
# Works around github.com/bazelbuild/bazel/issues/1054
node_context_data = rule(
    implementation = _impl,
    attrs = {
        "stamp": attr.bool(mandatory = True),
    },
    doc = _DOC,
)
