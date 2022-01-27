workspace(
    name = "next_app",
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# This provides the basic tools for running and packaging nodejs programs in Bazel
http_archive(
    name = "build_bazel_rules_nodejs",
    patches = ["//:rules_nodejs.patch"],
    sha256 = "d63ecec7192394f5cc4ad95a115f8a6c9de55c60d56c1f08da79c306355e4654",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/4.6.1/rules_nodejs-4.6.1.tar.gz"],
)

load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

yarn_install(
    name = "npm",
    exports_directories_only = True,
    package_json = "//:package.json",
    strict_visibility = False,
    symlink_node_modules = True,
    yarn_lock = "//:yarn.lock",
)

http_archive(
    name = "aspect_rules_swc",
    sha256 = "b58c8f3681215af30842bc3eeec30c9d2047cdf63302bba7d2e86c55a5c77edf",
    strip_prefix = "rules_swc-0.3.1",
    url = "https://github.com/aspect-build/rules_swc/archive/v0.3.1.tar.gz",
)

# Fetches the rules_swc dependencies.
# If you want to have a different version of some dependency,
# you should fetch it *before* calling this.
# Alternatively, you can skip calling this function, so long as you've
# already fetched all the dependencies.
load("@aspect_rules_swc//swc:dependencies.bzl", "rules_swc_dependencies")

rules_swc_dependencies()

# Fetches a pre-built Rust-node binding from
# https://github.com/swc-project/swc/releases.
# If you'd rather compile it from source, you can use rules_rust, fetch the project,
# then register the toolchain yourself. (Note, this is not yet documented)
load("@aspect_rules_swc//swc:repositories.bzl", "swc_register_toolchains")

swc_register_toolchains(
    name = "swc",
    swc_version = "v1.2.119",
)

# Fetches a NodeJS interpreter, needed to run the swc CLI.
# You can skip this if you already register a nodejs toolchain.
load("@rules_nodejs//nodejs:repositories.bzl", "nodejs_register_toolchains")

nodejs_register_toolchains(
    name = "node16",
    node_version = "16.9.0",
)

http_archive(
    name = "io_bazel_rules_docker",
    sha256 = "59536e6ae64359b716ba9c46c39183403b01eabfbd57578e84398b4829ca499a",
    strip_prefix = "rules_docker-0.22.0",
    urls = ["https://github.com/bazelbuild/rules_docker/releases/download/v0.22.0/rules_docker-v0.22.0.tar.gz"],
)

load(
    "@io_bazel_rules_docker//repositories:repositories.bzl",
    container_repositories = "repositories",
)

container_repositories()

load("@io_bazel_rules_docker//repositories:deps.bzl", container_deps = "deps")

container_deps()

load(
    "@io_bazel_rules_docker//nodejs:image.bzl",
    nodejs_image_repositories = "repositories",
)

nodejs_image_repositories()
