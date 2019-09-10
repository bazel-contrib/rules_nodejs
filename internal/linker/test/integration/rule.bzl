"Minimal fixture for executing the linker's starlark code"

load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "register_node_modules_linker")

def _linked(ctx):
    inputs = ctx.files.deps[:]
    outputs = [ctx.outputs.out]
    args = ctx.actions.args()
    register_node_modules_linker(ctx, args, inputs)
    args.add(ctx.outputs.out.path)
    ctx.actions.run(
        inputs = inputs,
        outputs = outputs,
        executable = ctx.executable.program,
        arguments = [args],
    )

linked = rule(_linked, attrs = {
    "out": attr.output(),
    "program": attr.label(executable = True, cfg = "host", mandatory = True),
    "deps": attr.label_list(aspects = [module_mappings_aspect]),
})
