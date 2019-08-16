"""
Support running the Less processor as a Bazel rule.
"""

def _less_binary(ctx):
    src = ctx.file.src

    # We want foo.less to produce foo.css
    output_name = src.basename[:-5] + ".css"
    css_output = ctx.actions.declare_file(output_name)
    outputs = [css_output]
    args = ctx.actions.args()

    args.add("--silent")
    if (ctx.attr.sourcemap):
        args.add("--source-map")
        map_output = ctx.actions.declare_file(output_name + ".map")
        outputs.append(map_output)

    args.add_all([src.path, css_output.path])

    ctx.actions.run(
        outputs = [css_output, map_output],
        inputs = [src] + ctx.files.deps,
        executable = ctx.executable.compiler,
        arguments = [
            args,
        ],
    )
    return [
        DefaultInfo(files = depset([css_output, map_output])),
    ]

less_binary = rule(
    implementation = _less_binary,
    attrs = {
        "src": attr.label(
            mandatory = True,
            allow_single_file = True,
        ),
        "compiler": attr.label(
            doc = """Label that points to the lessc binary to run.
            If you install your npm packages to a workspace named something other than "npm",
            you may need to set this to `@my_npm_name//less/bin:lessc`""",
            default = Label("@npm//less/bin:lessc"),
            cfg = "host",
            executable = True,
        ),
        "sourcemap": attr.bool(
            doc = "Generates a sourcemap",
            default = True,
        ),
        "deps": attr.label_list(
            allow_files = True,
        ),
    },
)
