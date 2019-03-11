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

workspace(name = "npm_bazel_typescript")

# Load nested npm_bazel_karma repository
local_repository(
    name = "npm_bazel_karma",
    path = "internal/karma",
)

# Load our dependencies
load("//:package.bzl", "rules_typescript_dev_dependencies")

rules_typescript_dev_dependencies()

# Load rules_karma dependencies
load("@npm_bazel_karma//:package.bzl", "rules_karma_dependencies")

rules_karma_dependencies()

# Setup nodejs toolchain
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "yarn_install")

# Use a bazel-managed npm dependency, allowing us to test resolution to these paths
yarn_install(
    name = "build_bazel_rules_typescript_internal_bazel_managed_deps",
    package_json = "//examples/bazel_managed_deps:package.json",
    yarn_lock = "//examples/bazel_managed_deps:yarn.lock",
)

# Install a hermetic version of node.
node_repositories()

# Download npm dependencies
yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Setup rules_go toolchain
load("@io_bazel_rules_go//go:def.bzl", "go_register_toolchains", "go_rules_dependencies")

go_rules_dependencies()

go_register_toolchains()

# Setup gazelle toolchain
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")

gazelle_dependencies()

# Setup typescript toolchain
load("//internal:ts_repositories.bzl", "ts_setup_dev_workspace")

ts_setup_dev_workspace()

# Dependencies for generating documentation
load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")

sass_repositories()

# Setup rules_webtesting toolchain
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

# Setup browser repositories
load("@npm_bazel_karma//:browser_repositories.bzl", "browser_repositories")

browser_repositories()

local_repository(
    name = "devserver_test_workspace",
    path = "devserver/devserver/test/test-workspace",
)
