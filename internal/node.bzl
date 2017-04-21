load(":executables.bzl", "get_node")

BASH_TEMPLATE = """
#!/usr/bin/env bash
set -e
# Resolve to 'this' node instance if other scripts
# have '/usr/bin/env node' shebangs
export PATH={node_bin_path}:$PATH
export NODE_PATH="{runfiles}"

# Uncomment for debugging
#ls -R
#echo "Node running in $(pwd)"
#echo "Running script {script_path}"
#env

# Run it
"{runfiles}/{node_bin}" "{runfiles}/{script_path}" $@
"""

def _node_binary_impl(ctx):
    node = ctx.file._node
    script = ctx.attr.main
    node_modules = ctx.files._node_modules

    ctx.file_action(
        output = ctx.outputs.executable,
        executable = True,
        content = BASH_TEMPLATE.format(
            node_bin = node.short_path,
            script_path = script,
            node_bin_path = node.dirname,
            runfiles = ctx.bin_dir.path + "/internal/tsc_wrapped.runfiles/io_bazel_rules_typescript"
        ),
    )

    return struct(
        runfiles = ctx.runfiles(
            files = [node] + node_modules,
            collect_data = True,
        ),
    )

node_binary = rule(
    _node_binary_impl,
    attrs = {
        "main": attr.string(),
        "data": attr.label_list(allow_files = True, cfg = "data"),
        "_node": attr.label(default = get_node(), allow_files = True, single_file = True),
        "_node_modules": attr.label(default = Label("@yarn//node_modules"))
    },
    executable = True,
)
