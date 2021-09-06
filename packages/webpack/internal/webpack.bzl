"""Webpack bundle producing rule defintion."""

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "ExternalNpmPackageInfo", "JSModuleInfo")
load("@build_bazel_rules_nodejs//internal/common:expand_variables.bzl", "expand_variables")

_DEFAULT_WEBPACK_CLI_BIN = (
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//webpack-cli/bin:webpack-cli"
)

_DEFAULT_WEBPACK_CLI_PACKAGE = (
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//webpack-cli"
)

MNEMONIC = "webpack"

def _webpack_impl(ctx):
    arguments = ctx.actions.args()
    execution_requirements = {}
    executable = ctx.executable.webpack_cli_bin
    progress_prefix = "Running webpack-cli"
    inputs = _inputs(ctx)
    outputs = []

    if ctx.attr.output_dir and ctx.outputs.outs:
        fail("Only one of output_dir and outs may be specified")
    if not ctx.attr.output_dir and not ctx.outputs.outs and not ctx.attr.stdout:
        fail("One of output_dir, outs or stdout must be specified")

    if ctx.attr.output_dir:
        outputs = [ctx.actions.declare_directory(ctx.attr.name)]
    else:
        outputs = ctx.outputs.outs

    for a in ctx.attr.args:
        arguments.add_all([expand_variables(ctx, e, outs = ctx.outputs.outs, output_dir = ctx.attr.output_dir) for e in _expand_locations(ctx, a)])

    if ctx.executable.worker_bin != None:
        # Set to use a multiline param-file for worker mode
        arguments.use_param_file("@%s", use_always = True)
        arguments.set_param_file_format("multiline")
        execution_requirements["supports-workers"] = "1"
        execution_requirements["worker-key-mnemonic"] = MNEMONIC
        progress_prefix = "{} (worker mode)".format(progress_prefix)
        executable = ctx.executable.worker_bin
        inputs.append(ctx.file.bazel_webpack_config)

        # arguments.add_all(["-c", ctx.file.bazel_webpack_config.path, "-c", ctx.file.webpack_config.path, "--merge", "--watch"])
        arguments.add_all(["-c", ctx.file.webpack_config.path])
    else:
        arguments.add_all(["-c", ctx.file.webpack_config.path])

    ctx.actions.run(
        arguments = [arguments],
        executable = executable,
        inputs = inputs,
        outputs = outputs,
        execution_requirements = execution_requirements,
        # The user can explicitly set the execution strategy
        mnemonic = MNEMONIC,
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
    return depset(ctx.files.data, transitive = inputs_depsets).to_list() + [ctx.file.webpack_config]

_webpack = rule(
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
            allow_files = True,
        ),
        "output_dir": attr.bool(),
        "outs": attr.output_list(),
        "webpack_config": attr.label(
            allow_single_file = [".js"],
            mandatory = True,
        ),
        "bazel_webpack_config": attr.label(
            allow_single_file = [".js"],
            default = Label("//packages/webpack/internal/worker:bazel.webpack.config.js"),
        ),
        "worker_bin": attr.label(
            executable = True,
            cfg = "exec",
            default = None,
        ),
        "webpack_cli_bin": attr.label(
            default = Label(_DEFAULT_WEBPACK_CLI_BIN),
            executable = True,
            cfg = "exec",
        ),
    },
)

def webpack_macro(
        name,
        supports_workers = False,
        webpack_cli_package = _DEFAULT_WEBPACK_CLI_PACKAGE,
        webpack_require_path = "webpack",
        **kwargs):
    """Compiles one Webpack bundle

    Args:
        name: A name for the target.
        args: Command line arguments that will be passed to the Webpack
        CLI.
        supports_workers: Whether this targets supports the bazel worker protocol.
        webpack_cli_package: Label of the package containing all data deps of tsc.

            For example, `webpack_cli_package = "@my_deps//webpack-cli"`

        webpack_require_path: Module name which resolves to typescript_package when required

            For example, `webpack_require_path = "../path/to/custom/node_modules/webpack-cli"`

        **kwargs: passed through to underlying nodejs_binary, allows eg. visibility, tags
    """

    data = kwargs.pop("data", [])
    worker_bin = None
    if supports_workers:
        worker_bin = "{}_worker_bin".format(name)
        nodejs_binary(
            name = worker_bin,
            data = data + [
                # BEGIN-INTERNAL
                # Users get this dependency transitively from @bazel/webpack
                # but that's our own code, so we don't.
                "@npm//protobufjs",
                # END-INTERNAL
                Label(webpack_cli_package),
                Label("//packages/webpack/internal/worker:filegroup"),
            ],
            entry_point = Label("//packages/webpack/internal/worker:worker_adapter.js"),
        )

    _webpack(
        name = name,
        worker_bin = worker_bin,
        data = data,
        **kwargs
    )
