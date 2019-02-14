"Run history-server"

load("@build_bazel_rules_nodejs//internal/node:node.bzl", "nodejs_binary_macro")

def history_server(templated_args = [], **kwargs):
    """
    This is a simple Bazel wrapper around the history-server npm package.

    See https://www.npmjs.com/package/history-server

    A typical frontend project is served by a specific server.
    This one can support the Angular router.

    Args:
      templated_args: arguments to pass to every invocation of the binary
      **kwargs: passed through to the underlying nodejs_binary
    """

    # By default, serve the directory where the target is declared.
    # This assumes there is an index.html in the package directory.
    if not templated_args:
        if native.package_name():
            templated_args = [native.package_name()]
        else:
            templated_args = ["."]

    nodejs_binary_macro(
        node_modules = "@history-server_runtime_deps//:node_modules",
        entry_point = "history-server/modules/cli.js",
        install_source_map_support = False,
        templated_args = templated_args,
        **kwargs
    )
