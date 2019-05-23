# Copyright 2017 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

workspace(
    name = "build_bazel_rules_nodejs",
    managed_directories = {
        "@fine_grained_deps_npm": ["internal/e2e/fine_grained_deps/npm/node_modules"],
        "@fine_grained_deps_yarn": ["internal/e2e/fine_grained_deps/yarn/node_modules"],
        "@fine_grained_no_bin": ["internal/e2e/fine_grained_no_bin/node_modules"],
        "@npm": ["node_modules"],
    },
)

load("//:package.bzl", "rules_nodejs_dev_dependencies")

rules_nodejs_dev_dependencies()

load("//internal/common:check_bazel_version.bzl", "check_bazel_version")

# 0.18.0: support for .bazelignore
# 0.23.0: required fix for pkg_tar strip_prefix
# 0.26.0: managed_directories feature added
check_bazel_version(
    message = """
You no longer need to install Bazel on your machine.
rules_nodejs has a dependency on the @bazel/bazel package which supplies it.
Try running `yarn bazel` instead.
""",
    minimum_bazel_version = "0.26.0",
)

#
# Load and install our dependencies downloaded above.
#

local_repository(
    name = "examples_program",
    path = "examples/program",
)

local_repository(
    name = "internal_e2e_packages",
    path = "internal/e2e/packages",
)

load("//:defs.bzl", "node_repositories", "npm_install", "yarn_install")

# Install a hermetic version of node.
# After this is run, these labels will be available:
# - NodeJS:
#   @nodejs//:node
# - NPM:
#   @nodejs//:npm
# - The yarn package manager:
#   @nodejs//:yarn
#
# To install the node_modules of all the listed package_json files run:
#   bazel run @nodejs//:yarn
# or
#   bazel run @nodejs//:npm
node_repositories(
    package_json = [
        "//:package.json",
        "@examples_program//:package.json",
        "//internal/npm_install/test:package/package.json",
    ],
    preserve_symlinks = True,
)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Install all Bazel dependencies needed for npm packages that supply Bazel rules
load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies()

load("@internal_e2e_packages//:setup_workspace.bzl", "internal_e2e_packages_setup_workspace")

internal_e2e_packages_setup_workspace()

# Dependencies to run skydoc
load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")

sass_repositories()

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")

skydoc_repositories()

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")

protobuf_deps()

#
# Install npm dependencies for tests
#

yarn_install(
    name = "fine_grained_deps_yarn",
    included_files = [
        "",
        ".js",
        ".d.ts",
        ".json",
        ".proto",
    ],
    package_json = "//internal/e2e/fine_grained_deps:yarn/package.json",
    yarn_lock = "//internal/e2e/fine_grained_deps:yarn/yarn.lock",
)

npm_install(
    name = "fine_grained_deps_npm",
    included_files = [
        "",
        ".js",
        ".d.ts",
        ".json",
        ".proto",
    ],
    package_json = "//internal/e2e/fine_grained_deps:npm/package.json",
    package_lock_json = "//internal/e2e/fine_grained_deps:npm/package-lock.json",
)

yarn_install(
    name = "fine_grained_no_bin",
    package_json = "//internal/e2e/fine_grained_no_bin:package.json",
    yarn_lock = "//internal/e2e/fine_grained_no_bin:yarn.lock",
)

load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")

# Creates toolchain configuration for remote execution with BuildKite CI
# for rbe_ubuntu1604
rbe_autoconfig(
    name = "buildkite_config",
)
