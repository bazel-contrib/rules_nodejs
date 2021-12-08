"Simple rule to test nodejs toolchain"

def _my_nodejs_impl(ctx):
    if ctx.attr.toolchain:
        toolchain = ctx.attr.toolchain[platform_common.ToolchainInfo].nodeinfo
    else:
        toolchain = ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo
    ctx.actions.run(
        inputs = toolchain.tool_files + [ctx.file.entry_point],
        executable = toolchain.target_tool_path,
        arguments = [ctx.file.entry_point.path, ctx.outputs.out.path],
        outputs = [ctx.outputs.out],
    )
    return []

my_nodejs = rule(
    implementation = _my_nodejs_impl,
    attrs = {
        "entry_point": attr.label(allow_single_file = True),
        "out": attr.output(),
        "toolchain": attr.label(),
    },
    toolchains = ["@rules_nodejs//nodejs:toolchain_type"],
)
