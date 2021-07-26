"Install toolchain dependencies"

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")
load(":mock_io_bazel_rules_closure.bzl", "mock_io_bazel_rules_closure")

def npm_bazel_labs_dependencies():
    """
    Fetch our transitive dependencies.

    If the user wants to get a different version of these, they can just fetch it
    from their WORKSPACE before calling this function, or not call this function at all.
    """

    _maybe(
        http_archive,
        name = "com_github_grpc_grpc_web",
        sha256 = "8d9b1e9b839a5254aa79cb4068b05fdb6e1de5637c1b8551f95144159a4801f2",
        strip_prefix = "grpc-web-1.2.0",
        urls = [
            "https://github.com/grpc/grpc-web/archive/1.2.0.tar.gz",
        ],
    )

    http_archive(
        name = "rules_proto",
        sha256 = "e0cab008a9cdc2400a1d6572167bf9c5afc72e19ee2b862d18581051efab42c9",
        strip_prefix = "rules_proto-c0b62f2f46c85c16cb3b5e9e921f0d00e3101934",
        urls = [
            "https://github.com/bazelbuild/rules_proto/archive/c0b62f2f46c85c16cb3b5e9e921f0d00e3101934.tar.gz",
        ],
    )

    _maybe(
        mock_io_bazel_rules_closure,
        name = "io_bazel_rules_closure",
    )

    yarn_install(
        name = "build_bazel_rules_typescript_grpc_web_compiletime_deps",
        package_json = Label("//packages/labs/grpc_web:package.json"),
        yarn_lock = Label("//packages/labs/grpc_web:yarn.lock"),
        # Do not symlink node_modules as when used in downstream repos we should not create
        # node_modules folders in the external repository. This is
        # not supported by managed_directories.
        symlink_node_modules = False,
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
