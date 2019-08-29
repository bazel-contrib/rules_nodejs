"Minimal fixture for executing the linker's starlark code"

load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "register_node_modules_linker")

def _linked(ctx):
    inputs = []
    args = ctx.actions.args()
    register_node_modules_linker(ctx, args, inputs)
    return [DefaultInfo(
        runfiles = ctx.runfiles(files = inputs + ctx.files.deps),
    )]

linked = rule(_linked, attrs = {
    "deps": attr.label_list(aspects = [module_mappings_aspect]),
})
