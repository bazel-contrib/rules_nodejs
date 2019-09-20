"Install toolchain dependencies"

load("@build_bazel_rules_nodejs//:defs.bzl", "yarn_install")

def npm_bazel_labs_dependencies():
    yarn_install(
        name = "build_bazel_rules_typescript_protobufs_compiletime_deps",
        package_json = "@npm_bazel_labs//protobufjs:package.json",
        yarn_lock = "@npm_bazel_labs//protobufjs:yarn.lock",
        # Do not symlink node_modules as when used in downstream repos we should not create
        # node_modules folders in the @npm_bazel_typescript external repository. This is
        # not supported by managed_directories.
        symlink_node_modules = False,
    )
