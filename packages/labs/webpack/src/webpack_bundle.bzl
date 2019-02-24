WEBPACK_BUNDLE_ATTRS = {
    "srcs": attr.label_list(allow_files = True),
    "entry_point": attr.label(allow_single_file = True, mandatory = True),
    "webpack": attr.label(default = "@npm_bazel_labs//webpack/src:cli", executable = True, cfg = "host"),
}
WEBPACK_BUNDLE_OUTS = {
    "bundle": "%{name}.js",
    "sourcemap": "%{name}.map",
}

def _webpack_bundle(ctx):
    args = ctx.actions.args()
    args.use_param_file("%s", use_always = True)
    args.add(ctx.outputs.bundle.path)
    args.add(ctx.outputs.sourcemap.path)
    args.add(ctx.file.entry_point.path)
<<<<<<< HEAD

=======
    
>>>>>>> Introduce a webpack_bundle rule
    ctx.actions.run(
        inputs = ctx.files.srcs,
        executable = ctx.executable.webpack,
        outputs = [ctx.outputs.bundle, ctx.outputs.sourcemap],
        arguments = [args],
        progress_message = "Bundling with Webpack: %s" % ctx.outputs.bundle.path,
    )
    return [DefaultInfo()]

webpack_bundle = rule(
    implementation = _webpack_bundle,
    attrs = WEBPACK_BUNDLE_ATTRS,
    outputs = WEBPACK_BUNDLE_OUTS,
)
