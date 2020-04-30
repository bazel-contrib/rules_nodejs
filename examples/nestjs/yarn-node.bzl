
template = """
#!/bin/bash
# since YARN will use the bazel installed NodeJS binary
# yarn berry will use the same NodeJS binary that it was called with to
# execute the "node" command, meaning that this command will use the bazel defiend NodeJS version/binary
{YARN} node {ENTRY_POINT}
"""

def _imp(ctx):
    sources = ctx.files.data + [ctx.file.entry_point]
    executable = ctx.actions.declare_file(ctx.label.name + ".yarnbin")
    
    executable_content = template.format(
        YARN = ctx.executable.yarn.short_path,
        ENTRY_POINT = ctx.file.entry_point.short_path,
    )
    ctx.actions.write(executable, executable_content, is_executable = True)

    return [
        DefaultInfo(
            executable = executable,
            runfiles = ctx.runfiles(
                files = sources ,
                transitive_files = depset([ctx.file.yarn]),
                collect_data = True,
            )
        )
    ]

yarn_nodejs_binary = rule(
    implementation = _imp,
    executable = True,
    attrs = {
        "data": attr.label_list(
            default = [],
            allow_files = True,
        ),
        "entry_point": attr.label(
            mandatory = True,
            allow_single_file = True,
        ),
        "yarn": attr.label(
            default = "@nodejs//:yarn",
            executable = True,
            allow_single_file = True,
            cfg = "host"
        ) 
    },
)
