load(":executables.bzl", "get_node")

BASH_TEMPLATE = """
#!/usr/bin/env bash
set -e
# Resolve to 'this' node instance if other scripts
# have '/usr/bin/env node' shebangs
export PATH={node_bin_path}:$PATH
# Run it
"{node_bin}" "{script_path}" $@
"""

def _node_binary_impl(ctx):
    node = ctx.file._node
    script = ctx.file.main
    node_modules = ctx.files._node_modules

    ctx.file_action(
        output = ctx.outputs.executable,
        executable = True,
        content = BASH_TEMPLATE.format(
            node_bin = node.path,
            script_path = script.path,
            node_bin_path = node.dirname,
        ),
    )

    return struct(
        runfiles = ctx.runfiles(
            files = [node, script] + node_modules,
            collect_data = True,
        ),
    )

node_binary = rule(
    _node_binary_impl,
    attrs = {
        "main": attr.label(single_file = True, allow_files = True),
        "data": attr.label_list(allow_files = True, cfg = "data"),
        "_node": attr.label(default = get_node(), allow_files = True, single_file = True),
        "_node_modules": attr.label(default = Label("@yarn//node_modules"))
    },
    executable = True,
)
