""" Generated code; do not edit
Update by running yarn update-esbuild-versions

Helper macro for fetching esbuild versions for internal tests and examples in rules_nodejs
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_VERSION = "0.11.6"

def esbuild_dependencies():
    """Helper to install required dependencies for the esbuild rules"""

    version = _VERSION

    http_archive(
        name = "esbuild_darwin",
        urls = [
            "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["bin/esbuild"])""",
        sha256 = "2b06365b075b854654fc9ed26fcd48a0c38947e1c8d5151ce400cd1e173bb138",
    )
    http_archive(
        name = "esbuild_windows",
        urls = [
            "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["esbuild.exe"])""",
        sha256 = "ddab1121833f0a12ca4fb3e288231e058f5526310671e84c0a9aa575340bb20b",
    )
    http_archive(
        name = "esbuild_linux",
        urls = [
            "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["bin/esbuild"])""",
        sha256 = "34612e3e15e6c31d9d742d3fd677bd5208b7e5c0ee9c93809999138c6c5c1039",
    )
