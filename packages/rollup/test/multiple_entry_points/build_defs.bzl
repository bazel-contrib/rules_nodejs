"""TODO"""

def _simple_dir_impl(ctx):
    """Generates a directory which contains the given files."""
    dir = ctx.actions.declare_directory(ctx.attr.name)

    ctx.actions.run_shell(
        command = """
            for file in "$@"; do
                cp ${{file}} {output_dir}/$(basename ${{file}})
            done
        """.format(
            output_dir = dir.path,
        ),
        arguments = [file.path for file in ctx.files.files],
        inputs = ctx.files.files,
        outputs = [dir],
    )

    return DefaultInfo(files = depset([dir]))

simple_dir = rule(
    implementation = _simple_dir_impl,
    attrs = {
        "files": attr.label_list(allow_files = True),
    },
)
