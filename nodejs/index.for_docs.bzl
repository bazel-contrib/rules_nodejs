"""# rules_nodejs Bazel module

Features:
- A [Toolchain](https://docs.bazel.build/versions/main/toolchains.html) 
  that fetches a hermetic copy of node and npm - independent of what's on the developer's machine.
- Core [Providers](https://docs.bazel.build/versions/main/skylark/rules.html#providers) to allow interop between JS rules.
"""

load(
    ":providers.bzl",
    _UserBuildSettingInfo = "UserBuildSettingInfo",
)
load(":repositories.bzl", _node_repositories = "node_repositories")
load(":toolchain.bzl", _nodejs_toolchain = "node_toolchain")

UserBuildSettingInfo = _UserBuildSettingInfo
node_repositories = _node_repositories
node_toolchain = _nodejs_toolchain
