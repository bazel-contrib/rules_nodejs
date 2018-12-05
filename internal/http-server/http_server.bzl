"Run http-server"

load("@build_bazel_rules_nodejs//internal/node:node.bzl", "nodejs_binary_macro")

def http_server(templated_args = [], **kwargs):
    """
    This is a simple Bazel wrapper around the http-server npm package.

    See https://www.npmjs.com/package/http-server

    A typical frontend project is served by a specific server.
    For typical example applications, our needs are simple so we can just use http-server.
    Real projects might need history-server (for router support) or even better a full-featured production server like express.

    This rule uses a modified http-server to support serving Brotli-compressed files, which end with a .br extension.
    This is equivalent to gzip-compression support.
    See https://github.com/alexeagle/http-server/commits/master which points to a modified ecstatic library.

    Args:
        templated_args: arguments to pass to every invocation of the binary
        **kwargs: passed through to the underlying nodejs_binary
    """

    # By default, we pass an argument pointing the http server to the
    # package of the caller.
    # This assumes there is an index.html in the package directory.
    if not templated_args:
        templated_args = [native.package_name()]

    nodejs_binary_macro(
        node_modules = "@http-server_runtime_deps//:node_modules",
        entry_point = "http-server/bin/http-server",
        install_source_map_support = False,
        templated_args = templated_args,
        **kwargs
    )
