"""
Support running the stylus processor as a Bazel rule.
"""

def _stylus_binary(ctx):
    src = ctx.file.src

    # We want foo.styl to produce foo.css
    output_name = src.basename[:-5] + ".css"
    css_output = ctx.actions.declare_file(output_name)
    outputs = [css_output]
    args = ctx.actions.args()

    # Resolve relative urls inside imports
    args.add("--resolve-url")
    if (ctx.attr.compress):
        args.add("--compress")
    if (ctx.attr.sourcemap):
        args.add("--sourcemap")
        map_output = ctx.actions.declare_file(output_name + ".map")
        outputs.append(map_output)

    args.add_all([
        "--out",
        ctx.bin_dir.path + "/" + ctx.label.package,
        src.path,
    ])

    ctx.actions.run(
        outputs = outputs,
        inputs = [src] + ctx.files.deps,
        executable = ctx.executable.compiler,
        arguments = [args],
    )
    return [
        DefaultInfo(files = depset(outputs)),
    ]

stylus_binary = rule(
    implementation = _stylus_binary,
    attrs = {
        "src": attr.label(
            doc = "A single .styl Stylus file to transform",
            mandatory = True,
            allow_single_file = True,
        ),
        "compiler": attr.label(
            doc = """Label that points to the stylus binary to run.
            If you install your npm packages to a workspace named something other than "npm",
            you may need to set this to `@my_npm_name//stylus/bin:stylus`""",
            default = Label("@npm//stylus/bin:stylus"),
            cfg = "host",
            executable = True,
        ),
        "compress": attr.bool(
            doc = "Compress CSS output",
            default = True,
        ),
        "sourcemap": attr.bool(
            doc = "Generates a sourcemap in sourcemaps v3 format",
            default = True,
        ),
        "deps": attr.label_list(
            doc = "Other stylus files that are imported from the src",
            allow_files = True,
        ),
    },
)
