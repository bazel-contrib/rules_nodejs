load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

def webpack_dev_server(
        name,
        webpack_config,
        args = [],
        data = [],
        tags = [],
        ibazel_webpack_plugin = "//packages/webpack/internal/devserver:webpack.config.js",
        **kwargs):
    nodejs_binary(
        name = name,
        entry_point = _webpack_cli_bin,
        tags = ["ibazel_notify_changes"] + tags,
        args = [
            "serve",
            "-c",
            "$(rootpath %s)" % ibazel_webpack_plugin,
            "--merge",
            "-c",
            "$(rootpath %s)" % webpack_config,
        ] + args,
        # TODO: Ask Alex why this seems to be necessary. It appears as if node_moduels are not being linked into the runfiles directory but I don't know why.
        templated_args = ["--bazel_patch_module_resolver"],
        data = [
            ibazel_webpack_plugin,
            webpack_config,
            _webpack_cli,
            _webpack_dev_server,
            _webpack,
        ] + data,
        **kwargs
    )

_webpack_cli = Label(
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//webpack-cli",
)

_webpack_dev_server = Label(
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//webpack-dev-server",
)

_webpack = Label(
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//webpack",
)

_webpack_cli_bin = Label(
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//:node_modules/webpack-cli/bin/cli.js",
)
