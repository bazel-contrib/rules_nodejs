"fixture for testing terser"

load("@build_bazel_rules_nodejs//:providers.bzl", "JSModuleInfo")

def _consume(ctx):
    if not JSModuleInfo in ctx.attr.src:
        fail("Cannot consume %s because it doesn't provide JSModuleInfo" % ctx.attr.src.label)

    module_srcs = ctx.attr.src[JSModuleInfo].sources.to_list()

    if len(module_srcs) != 1:
        fail("expected to consume a single file")

    ctx.actions.expand_template(
        template = module_srcs[0],
        output = ctx.outputs.js,
        substitutions = {},
    )

    return []

consumes_jsinfo = rule(
    _consume,
    attrs = {"src": attr.label()},
    outputs = {
        "js": "%{name}.js",
    },
)
