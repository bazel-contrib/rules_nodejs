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

workspace(name = "build_bazel_rules_nodejs")

load("//:package.bzl", "rules_nodejs_dev_dependencies")

rules_nodejs_dev_dependencies()

load("//internal/common:check_bazel_version.bzl", "check_bazel_version")

# 0.18.0: support for .bazelignore
# 0.23.0: required fix for pkg_tar strip_prefix
check_bazel_version(minimum_bazel_version = "0.23.0")

#
# Load and install our dependencies downloaded above.
#

local_repository(
    name = "program_example",
    path = "examples/program",
)

local_repository(
    name = "packages_example",
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
        "@program_example//:package.json",
        "//internal/npm_install/test:package/package.json",
    ],
    preserve_symlinks = True,
)

yarn_install(
    name = "npm",
    data = [
        "@build_bazel_rules_nodejs//:tools/npm_packages/hello/index.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/hello/package.json",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_index/index.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_index_2/index.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_index_2/package.json",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_index_3/index.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_index_3/package.json",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_index_4/index.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_index_4/package.json",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_main/main.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_main/package.json",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_main_2/main.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_main_2/package.json",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_nested_main/nested/main.js",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_nested_main/nested/package.json",
        "@build_bazel_rules_nodejs//:tools/npm_packages/node_resolve_nested_main/package.json",
    ],
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Install all Bazel dependencies needed for npm packages that supply Bazel rules
load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies()

load("@packages_example//:setup_workspace.bzl", "packages_example_setup_workspace")

packages_example_setup_workspace()

# Dependencies to run skydoc
load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")

sass_repositories()

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")

skydoc_repositories()

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
    package_json = "//internal/e2e/fine_grained_deps:package.json",
    yarn_lock = "//internal/e2e/fine_grained_deps:yarn.lock",
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
    package_json = "//internal/e2e/fine_grained_deps:package.json",
    package_lock_json = "//internal/e2e/fine_grained_deps:package-lock.json",
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
