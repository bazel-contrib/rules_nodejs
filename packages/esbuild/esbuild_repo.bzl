"""
Helper macro for fetching esbuild versions for internal tests and examples in rules_nodejs
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# IMPORTANT: Keep this file in sync with the documentation in _README.md

_VERSION = "0.8.48"  # reminder: update SHAs below when changing this version

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
        sha256 = "d21a722873ed24586f071973b77223553fca466946f3d7e3976eeaccb14424e6",
    )

    http_archive(
        name = "esbuild_windows",
        urls = [
            "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["esbuild.exe"])""",
        sha256 = "fe5dcb97b4c47f9567012f0a45c19c655f3d2e0d76932f6dd12715dbebbd6eb0",
    )

    http_archive(
        name = "esbuild_linux",
        urls = [
            "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["bin/esbuild"])""",
        sha256 = "60dabe141e5dfcf99e7113bded6012868132068a582a102b258fb7b1cfdac14b",
    )
