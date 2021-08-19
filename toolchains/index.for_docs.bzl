"""Public API for toolchains

These provide platform-specific tool binaries for rules to consume and use.
They are mostly useful for authors of custom rules, and aren't exposed to end-users.

See https://docs.bazel.build/versions/main/toolchains.html
"""

load("//toolchains/cypress:cypress_repositories.bzl", _cypress_repositories = "cypress_repositories")
load("//toolchains/cypress:cypress_toolchain.bzl", _cypress_toolchain = "cypress_toolchain")
load("//toolchains/esbuild:esbuild_repositories.bzl", _esbuild_repositories = "esbuild_repositories")
load("//toolchains/esbuild:toolchain.bzl", _configure_esbuild_toolchains = "configure_esbuild_toolchains")
load("//toolchains/node:node_toolchain_configure.bzl", _node_toolchain_configure = "node_toolchain_configure")
load("//toolchains/node:node_toolchain.bzl", _node_toolchain = "node_toolchain")

cypress_repositories = _cypress_repositories
cypress_toolchain = _cypress_toolchain
esbuild_repositories = _esbuild_repositories
configure_esbuild_toolchains = _configure_esbuild_toolchains
node_toolchain_configure = _node_toolchain_configure
node_toolchain = _node_toolchain
