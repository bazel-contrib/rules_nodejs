"Simple rule to test nodejs toolchain"

def _my_nodejs_impl(ctx):
    if ctx.attr.toolchain:
        nodeinfo = ctx.attr.toolchain[platform_common.ToolchainInfo].nodeinfo
    else:
        nodeinfo = ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo

    inputs = depset(
        [ctx.file.entry_point],
        transitive = [nodeinfo.node_data] if hasattr(nodeinfo, "node_data") else None,
    )

    ctx.actions.run(
        inputs = inputs,
        executable = nodeinfo.node,
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

def _check_node_data_impl(ctx):
    """Test rule that verifies node_data files are present in the action sandbox."""
    nodeinfo = ctx.attr.toolchain[platform_common.ToolchainInfo].nodeinfo

    node_data = nodeinfo.node_data if hasattr(nodeinfo, "node_data") else depset()
    node_data_list = node_data.to_list()
    if not node_data_list:
        fail("Expected node_data to contain files")

    # Pass each node_data file path as an arg so the JS script can check existence
    args = [ctx.file.entry_point.path, ctx.outputs.out.path] + [f.path for f in node_data_list]

    ctx.actions.run(
        inputs = depset([ctx.file.entry_point], transitive = [node_data]),
        executable = nodeinfo.node,
        arguments = args,
        outputs = [ctx.outputs.out],
    )
    return []

check_node_data = rule(
    implementation = _check_node_data_impl,
    attrs = {
        "entry_point": attr.label(allow_single_file = True),
        "out": attr.output(),
        "toolchain": attr.label(mandatory = True),
    },
)
