""" Generated code; do not edit
Update by running yarn update-esbuild-versions

Helper macro for fetching esbuild versions for internal tests and examples in rules_nodejs
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_VERSION = "0.8.57"

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
        sha256 = "9adbb59f4a42a228c4036ffc26b10e33449bf5272b94f0996a4f3d7a20068aef",
    )
    http_archive(
        name = "esbuild_windows",
        urls = [
            "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["esbuild.exe"])""",
        sha256 = "225ca4180dfc8c2ff9f638e0c8df38ab698909fd1035f68cfa12c5c5f55fa099",
    )
    http_archive(
        name = "esbuild_linux",
        urls = [
            "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % version,
        ],
        strip_prefix = "package",
        build_file_content = """exports_files(["bin/esbuild"])""",
        sha256 = "76762543a555ecccf834013c92a1245ec3707241595b243e8e3a92546d4dbe50",
    )
