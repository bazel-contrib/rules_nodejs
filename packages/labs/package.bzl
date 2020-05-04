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
        sha256 = "04460e28ffa80bfc797a8758da10ba40107347ef0af8e9cc065ade10398da4bb",
        strip_prefix = "grpc-web-1.0.7",
        urls = [
            "https://github.com/grpc/grpc-web/archive/1.0.7.tar.gz",
        ],
    )

    _maybe(
        http_archive,
        name = "com_github_grpc_grpc_web",
        sha256 = "04460e28ffa80bfc797a8758da10ba40107347ef0af8e9cc065ade10398da4bb",
        strip_prefix = "grpc-web-1.0.7",
        urls = [
            "https://github.com/grpc/grpc-web/archive/1.0.7.tar.gz",
        ],
    )

    _maybe(
        http_archive,
        name = "rules_proto",
        sha256 = "4d421d51f9ecfe9bf96ab23b55c6f2b809cbaf0eea24952683e397decfbd0dd0",
        strip_prefix = "rules_proto-f6b8d89b90a7956f6782a4a3609b2f0eee3ce965",
        urls = [
            "https://github.com/bazelbuild/rules_proto/archive/f6b8d89b90a7956f6782a4a3609b2f0eee3ce965.tar.gz",
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
        # node_modules folders in the @npm_bazel_typescript external repository. This is
        # not supported by managed_directories.
        symlink_node_modules = False,
    )

    yarn_install(
        name = "build_bazel_rules_typescript_protobufs_compiletime_deps",
        package_json = Label("//packages/labs/protobufjs:package.json"),
        yarn_lock = Label("//packages/labs/protobufjs:yarn.lock"),
        # Do not symlink node_modules as when used in downstream repos we should not create
        # node_modules folders in the @npm_bazel_typescript external repository. This is
        # not supported by managed_directories.
        symlink_node_modules = False,
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
