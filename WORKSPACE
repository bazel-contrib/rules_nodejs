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
load("//:package.bzl", "rules_nodejs_dependencies", "rules_nodejs_dev_dependencies")

rules_nodejs_dependencies()
rules_nodejs_dev_dependencies()

load("//internal/common:check_bazel_version.bzl", "check_bazel_version")

# 0.18.0: support for .bazelignore
check_bazel_version("0.18.0")

#
# Load and install our dependencies downloaded above.
#

local_repository(
    name = "program_example",
    path = "examples/program",
)

local_repository(
    name = "packages_example",
    path = "examples/packages",
)

local_repository(
    name = "devserver_example",
    path = "examples/devserver",
)

local_repository(
    name = "nodejs_binary_example",
    path = "examples/nodejs_binary",
)

load("//:defs.bzl", "node_repositories", "yarn_install", "npm_install")

# Install a hermetic version of node.
# After this is run, these labels will be available:
# - NodeJS:
#   @nodejs//:node
# - NPM:
#   @nodejs//:npm
# - The yarn package manager:
#   @nodejs//:yarn
node_repositories(
    package_json = [
        "//:package.json",
        "//examples/rollup:package.json",
        "@program_example//:package.json",
        "//internal/test:package.json",
        "//internal/npm_install/test:package.json",
    ],
    preserve_symlinks = True,
)

# Now the user must run either
# bazel run @nodejs//:yarn
# or
# bazel run @nodejs//:npm

load("@packages_example//:setup_workspace.bzl", "packages_example_setup_workspace")
packages_example_setup_workspace()

load("@devserver_example//:setup_workspace.bzl", "devserver_example_setup_workspace")
devserver_example_setup_workspace()

load("@nodejs_binary_example//:setup_workspace.bzl", "nodejs_binary_example_setup_workspace")
nodejs_binary_example_setup_workspace()

# Dependencies to run skydoc
load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")
sass_repositories()

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")
skydoc_repositories()

# Dependencies to run buildifier and skylint
load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")
go_rules_dependencies()
go_register_toolchains()

#
# Install npm dependencies for tests
#

yarn_install(
    name = "fine_grained_deps_yarn",
    package_json = "//internal/e2e/fine_grained_deps:package.json",
    yarn_lock = "//internal/e2e/fine_grained_deps:yarn.lock",
)

npm_install(
    name = "fine_grained_deps_npm",
    package_json = "//internal/e2e/fine_grained_deps:package.json",
    package_lock_json = "//internal/e2e/fine_grained_deps:package-lock.json",
)
