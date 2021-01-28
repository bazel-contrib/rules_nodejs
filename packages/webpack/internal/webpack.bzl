"""Webpack bundle producing rule defintion."""

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "ExternalNpmPackageInfo", "JSModuleInfo")
load("@build_bazel_rules_nodejs//internal/common:expand_variables.bzl", "expand_variables")

def _webpack_impl(ctx):
    if ctx.attr.output_dir and ctx.outputs.outs:
        fail("Only one of output_dir and outs may be specified")
    if not ctx.attr.output_dir and not ctx.outputs.outs and not ctx.attr.stdout:
        fail("One of output_dir, outs or stdout must be specified")

    args = ctx.actions.args()
    inputs = _inputs(ctx)
    outputs = []

    if ctx.attr.output_dir:
        outputs = [ctx.actions.declare_directory(ctx.attr.name)]
    else:
        outputs = ctx.outputs.outs

    for a in ctx.attr.args:
        args.add_all([expand_variables(ctx, e, outs = ctx.outputs.outs, output_dir = ctx.attr.output_dir) for e in _expand_locations(ctx, a)])

    ctx.actions.run(
        arguments = [args],
        executable = ctx.executable.webpack_binary,
        inputs = inputs,
        outputs = outputs,
        # Tell Bazel that this program speaks the worker protocol
        execution_requirements = {"supports-workers": "1"},
        # The user can explicitly set the execution strategy
        mnemonic = "webpack",
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

_webpack = rule(
    implementation = _webpack_impl,
    attrs = {
        "args": attr.string_list(
            doc = """Command line arguments to pass to Webpack. Can be used to override config file settings.

These argument passed on the command line before arguments that are added by the rule.
Run `bazel` with `--subcommands` to see what Webpack CLI command line was invoked.

See the <a href="https://webpack.js.org/api/cli/">Webpack CLI docs</a> for a complete list of supported arguments.""",
            default = [],
        ),
        "data": attr.label_list(
            doc = """Other libraries for the webpack compilation""",
            allow_files = True,
        ),
        "output_dir": attr.bool(),
        "outs": attr.output_list(),
        "webpack_binary": attr.label(
            executable = True,
            cfg = "host",
        ),
    },
)

def webpack_macro(
        name,
        args,
        **kwargs):
    """Compiles one Webpack bundle

    Args:
        name: A name for the target.
        args: Command line arguments that will be passed to the Webpack
        CLI.
        **kwargs: passed through to underlying nodejs_binary, allows eg. visibility, tags
    """

    worker_binary = "{}_worker_binary".format(name)
    nodejs_binary(
        name = worker_binary,
        data = [
            # BEGIN-INTERNAL
            # Users get this dependency transitively from @bazel/webpack
            # but that's our own code, so we don't.
            "@npm//protobufjs",
            # END-INTERNAL
            Label("//packages/webpack/internal/worker:filegroup"),
        ],
        entry_point = Label("//packages/webpack/internal/worker:worker_adapter"),
    )

    _webpack(
        name = name,
        webpack_binary = worker_binary,
        **kwargs
    )
