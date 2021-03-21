""" Generated code; do not edit
Update by running yarn update-esbuild-versions

Helper macro for fetching esbuild versions for internal tests and examples in rules_nodejs
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_VERSION = "0.9.6"

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
        sha256 = "d0072bdcdac9271cd7c1e1104be779e42064cac44d5497a685cb621046ee5236",
    )
    http_archive(
        name = "esbuild_windows",
        urls = [
            "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["esbuild.exe"])""",
        sha256 = "3cfc09ee559ead66854866e1f8d25f6e94abf98ee46b17662a25fe3874d108f5",
    )
    http_archive(
        name = "esbuild_linux",
        urls = [
            "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["bin/esbuild"])""",
        sha256 = "c87042a6bb24b05d33aa0b0daf692358f78cc0f20b11e52a722bc772e02a812a",
    )
