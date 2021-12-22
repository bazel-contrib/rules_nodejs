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
        name = "com_google_protobuf",
        sha256 = "efaf69303e01caccc2447064fc1832dfd23c0c130df0dc5fc98a13185bb7d1a7",
        strip_prefix = "protobuf-678da4f76eb9168c9965afc2149944a66cd48546",
        urls = [
            "https://github.com/google/protobuf/archive/678da4f76eb9168c9965afc2149944a66cd48546.tar.gz",
        ],
    )

    _maybe(
        http_archive,
        name = "com_github_grpc_grpc_web",
        sha256 = "6ba86d2833ad0ed5e98308790bea4ad81214e1f4fc8838fe34c2e5ee053b73e6",
        strip_prefix = "grpc-web-1.3.0",
        urls = [
            "https://github.com/grpc/grpc-web/archive/1.3.0.tar.gz",
        ],
    )

    _maybe(
        http_archive,
        name = "rules_proto",
        sha256 = "66bfdf8782796239d3875d37e7de19b1d94301e8972b3cbd2446b332429b4df1",
        strip_prefix = "rules_proto-4.0.0",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/rules_proto/archive/refs/tags/4.0.0.tar.gz",
            "https://github.com/bazelbuild/rules_proto/archive/refs/tags/4.0.0.tar.gz",
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
