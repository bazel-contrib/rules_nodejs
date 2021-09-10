"""Info for fetching published concatjs binaries"""

load("//:version.bzl", "VERSION")
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_file")

# TODO: replace these with latest as we publish the release
_DARWIN_AMD64_SHA = "9739ca4efee1f005f41a5f8ab49c0cec6938cc0072f47288baa47837e84702d3"
_DARWIN_ARM64_SHA = "6c696a1d5cadd0c0b07d354aafed4954b49e854682c935748caf18dd9305a902"
_LINUX_AMD64_SHA = "5e91e48b8fe63b64d3cfd4803022055ddec67a5de682d0247d8ed224e3ad7646"
_LINUX_ARM64_SHA = "89de72dcd695fe3676aba8563d91b20d156f019dbb187bd74334efba411a449d"
_WINDOWS_AMD64_SHA = "3d8c246649ee798d4588c547f5685d06b041769d4c5f0a2cc9645098d60e0695"

CONCATJS_PACKAGES = struct(
    platforms = dict({
        "darwin_amd64": struct(
            sha = _DARWIN_AMD64_SHA,
            urls = [
                "https://github.com/bazelbuild/rules_nodejs/releases/download/%s/concatjs-darwin_x64" % VERSION,
            ],
            exec_compatible_with = [
                "@platforms//os:macos",
                "@platforms//cpu:x86_64",
            ],
        ),
        "darwin_arm64": struct(
            sha = _DARWIN_ARM64_SHA,
            urls = [
                "https://github.com/bazelbuild/rules_nodejs/releases/download/%s/concatjs-darwin_arm64" % VERSION,
            ],
            exec_compatible_with = [
                "@platforms//os:macos",
                "@platforms//cpu:aarch64",
            ],
        ),
        "linux_amd64": struct(
            sha = _LINUX_AMD64_SHA,
            urls = [
                "https://github.com/bazelbuild/rules_nodejs/releases/download/%s/concatjs-linux_x64" % VERSION,
            ],
            exec_compatible_with = [
                "@platforms//os:linux",
                "@platforms//cpu:x86_64",
            ],
        ),
        "linux_arm64": struct(
            sha = _LINUX_ARM64_SHA,
            urls = [
                "https://github.com/bazelbuild/rules_nodejs/releases/download/%s/concatjs-linux_arm64" % VERSION,
            ],
            exec_compatible_with = [
                "@platforms//os:linux",
                "@platforms//cpu:aarch64",
            ],
        ),
        # TODO: add linux for ppc64le and s390x
        "windows_amd64": struct(
            sha = _WINDOWS_AMD64_SHA,
            urls = [
                "https://github.com/bazelbuild/rules_nodejs/releases/download/%s/concatjs-windows_x64.exe" % VERSION,
            ],
            exec_compatible_with = [
                "@platforms//os:windows",
                "@platforms//cpu:x86_64",
            ],
        ),
    }),
)

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

def concatjs_repositories(name = ""):
    """Helper for fetching and setting up the concatjs toolchain

    Args:
        name: currently unused
    """

    for name, meta in CONCATJS_PACKAGES.platforms.items():
        _maybe(
            http_file,
            name = "concatjs_%s" % name,
            urls = meta.urls,
            strip_prefix = "package",
            build_file_content = """exports_files(["%s"])""" % meta.binary_path,
            sha256 = meta.sha,
        )

        toolchain_label = Label("@build_bazel_rules_nodejs//toolchains/concatjs:concatjs_%s_toolchain" % name)
        native.register_toolchains("@%s//%s:%s" % (toolchain_label.workspace_name, toolchain_label.package, toolchain_label.name))
