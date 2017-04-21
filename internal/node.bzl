load(":executables.bzl", "get_node")

def _node_binary_impl(ctx):
    node = ctx.file._node
    script = ctx.attr.main
    node_modules = ctx.files._node_modules

    ctx.template_action(
        template=ctx.file._launcher_template,
        output=ctx.outputs.executable,
        substitutions={
            "TEMPLATED_args": " ".join(ctx.attr.templated_args),
            "TEMPLATED_script_path": script,
        },
        executable=True,
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
        "templated_args": attr.string_list(default = []),
        "_node": attr.label(default = get_node(), allow_files = True, single_file = True),
        "_node_modules": attr.label(default = Label("@yarn//installed:node_modules")),
        "_launcher_template": attr.label(default = Label("//internal:node_launcher.sh"), allow_files = True, single_file = True)
    },
    executable = True,
)
