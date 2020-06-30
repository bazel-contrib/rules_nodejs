"""
This rule runs terser executable directly via ctx.actions.run instead of using the run_node function.
This ensures that there are no third-party npm deps in runfiles since run_node will add any
NodeRuntimeDepsInfo deps from the executable terser.
"""

_ATTRS = {
    "src": attr.label(
        allow_single_file = True,
        mandatory = True,
    ),
    "terser": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@npm//terser/bin:terser"),
    ),
}

_OUTPUTS = {
    "minified": "%{name}.js",
}

def _impl(ctx):
    args = ctx.actions.args()
    args.add(ctx.file.src.path)
    args.add_all(["--output", ctx.outputs.minified.path])

    ctx.actions.run(
        progress_message = "Optimizing JavaScript %s [terser]" % ctx.outputs.minified.short_path,
        executable = ctx.executable.terser,
        inputs = [ctx.file.src],
        outputs = [ctx.outputs.minified],
        arguments = [args],
    )

    return [DefaultInfo()]

no_npm_deps = rule(
    implementation = _impl,
    attrs = _ATTRS,
    outputs = _OUTPUTS,
)
