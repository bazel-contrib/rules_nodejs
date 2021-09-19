"""Webpack bundle producing rule defintion."""

load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "ExternalNpmPackageInfo", "JSModuleInfo", "node_modules_aspect", "run_node")
load("@build_bazel_rules_nodejs//internal/common:expand_variables.bzl", "expand_variables")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect")

MNEMONIC = "webpack"

def _webpack_impl(ctx):
    if ctx.attr.output_dir and ctx.outputs.outs:
        fail("Only one of output_dir and outs may be specified")
    if not ctx.attr.output_dir and not ctx.outputs.outs and not ctx.attr.stdout:
        fail("One of output_dir, outs or stdout must be specified")

    inputs = _inputs(ctx)
    outputs = []

    # See CLI documentation at https://webpack.js.org/api/cli/
    args = ctx.actions.args()

    if ctx.attr.supports_workers:
        # Set to use a multiline param-file for worker mode
        args.use_param_file("@%s", use_always = True)
        args.set_param_file_format("multiline")

    for a in ctx.attr.args:
        args.add_all([expand_variables(ctx, e, outs = ctx.outputs.outs, output_dir = ctx.attr.output_dir) for e in _expand_locations(ctx, a)])

    if ctx.attr.output_dir:
        outputs = [ctx.actions.declare_directory(ctx.attr.name)]
    else:
        outputs = ctx.outputs.outs

    executable = "webpack_bin"
    execution_requirements = {}

    if ctx.attr.supports_workers:
        executable = "webpack_worker_bin"
        execution_requirements["supports-workers"] = str(int(ctx.attr.supports_workers))

        args.add_all(["-c", ctx.file._bazel_webpack_config.path, "--merge"])
        inputs.append(ctx.file._bazel_webpack_config)

    # Add user defined config as an input and argument
    args.add_all(["-c", ctx.file.webpack_config.path])
    inputs.append(ctx.file.webpack_config)

    run_node(
        ctx,
        progress_message = "Running Webpack [webpack-cli]",
        executable = executable,
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
        mnemonic = MNEMONIC,
        execution_requirements = execution_requirements,
        env = {"COMPILATION_MODE": ctx.var["COMPILATION_MODE"]},
    )

    return [DefaultInfo(files = depset(outputs))]

def _expand_locations(ctx, s):
    # `.split(" ")` is a work-around https://github.com/bazelbuild/bazel/issues/10309
    # _expand_locations returns an array of args to support $(execpaths) expansions.
    # TODO: If the string has intentional spaces or if one or more of the expanded file
    # locations has a space in the name, we will incorrectly split it into multiple arguments
    return ctx.expand_location(s, targets = ctx.attr.data).split(" ")

def _inputs(ctx):
    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the ExternalNpmPackageInfo provider.
    inputs_depsets = []
    for d in ctx.attr.data:
        if ExternalNpmPackageInfo in d:
            inputs_depsets.append(d[ExternalNpmPackageInfo].sources)
        if JSModuleInfo in d:
            inputs_depsets.append(d[JSModuleInfo].sources)
        if DeclarationInfo in d:
            inputs_depsets.append(d[DeclarationInfo].declarations)
    return depset(ctx.files.data, transitive = inputs_depsets).to_list()

webpack = rule(
    implementation = _webpack_impl,
    attrs = {
        "args": attr.string_list(
            doc = """Command line arguments to pass to Webpack.

These argument passed on the command line before arguments that are added by the rule.
Run `bazel` with `--subcommands` to see what Webpack CLI command line was invoked.

See the <a href="https://webpack.js.org/api/cli/">Webpack CLI docs</a> for a complete list of supported arguments.""",
            default = [],
        ),
        "data": attr.label_list(
            doc = """Other libraries for the webpack compilation""",
            aspects = [module_mappings_aspect, node_modules_aspect],
            allow_files = True,
        ),
        "output_dir": attr.bool(),
        "outs": attr.output_list(),
        "supports_workers": attr.bool(
            doc = """Experimental! Use only with caution.

Allows you to enable the Bazel Worker strategy for this library.
When enabled, this rule invokes the "webpack_worker_bin"
worker aware binary rather than "webpack_bin".""",
            default = False,
        ),
        "webpack_worker_bin": attr.label(
            doc = "Internal use only",
            executable = True,
            cfg = "host",
            default = "//packages/webpack/bin:webpack-worker",
        ),
        "webpack_bin": attr.label(
            doc = "Target that executes the webpack-cli binary",
            executable = True,
            cfg = "host",
            default = Label(
                # BEGIN-INTERNAL
                "@npm" +
                # END-INTERNAL
                "//webpack-cli/bin:webpack-cli",
            ),
        ),
        "webpack_config": attr.label(
            allow_single_file = [".js"],
            mandatory = True,
        ),
        "_bazel_webpack_config": attr.label(
            allow_single_file = [".js"],
            default = Label("//packages/webpack/internal/worker:webpack.config.js"),
        ),
    },
)
