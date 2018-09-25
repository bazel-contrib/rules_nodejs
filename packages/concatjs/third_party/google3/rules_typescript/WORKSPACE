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

workspace(name = "build_bazel_rules_typescript")

load(
    "@build_bazel_rules_typescript//:package.bzl",
    "rules_typescript_dependencies",
    "rules_typescript_dev_dependencies",
)

rules_typescript_dependencies()
rules_typescript_dev_dependencies()

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "yarn_install")

# Use a bazel-managed npm dependency, allowing us to test resolution to these paths
yarn_install(
    name = "build_bazel_rules_typescript_internal_bazel_managed_deps",
    package_json = "//examples/bazel_managed_deps:package.json",
    yarn_lock = "//examples/bazel_managed_deps:yarn.lock",
)

# Deps for the //internal/e2e/reference_types_directive test
yarn_install(
    name = "build_bazel_rules_typescript_internal_reference_types_directive_deps",
    package_json = "//internal/e2e/reference_types_directive:package.json",
    yarn_lock = "//internal/e2e/reference_types_directive:yarn.lock",
)

# Install a hermetic version of node.
node_repositories(preserve_symlinks = True)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
    manual_build_file_contents = """
filegroup(
  name = "@bazel/typescript",
  srcs = [],
)

filegroup(
  name = "@bazel/karma",
  srcs = [],
)
""",
)

load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")

go_rules_dependencies()
go_register_toolchains()

load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")

gazelle_dependencies()

load("@io_bazel_rules_webtesting//web:repositories.bzl", "browser_repositories", "web_test_repositories")

web_test_repositories()
browser_repositories(
    chromium = True,
    firefox = True,
)

load(
    "@build_bazel_rules_typescript//:defs.bzl",
    "ts_setup_workspace",
    "check_rules_typescript_version",
)

ts_setup_workspace()

# Test that check_rules_typescript_version works as expected
check_rules_typescript_version("0.15.3")

# Dependencies for generating documentation
load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")

sass_repositories()

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")

skydoc_repositories()

# Tell Bazel where the nested local repositories are that are
# used for tests. This is necessary so that `bazel <cmd> ...`
# doesn't traverse into nested local repositories.
local_repository(
  name = "ts_auto_deps_e2e",
  path = "internal/e2e/ts_auto_deps",
)

local_repository(
  name = "package_karma_e2e",
  path = "internal/e2e/package_karma",
)

local_repository(
  name = "package_typescript_27_e2e",
  path = "internal/e2e/package_typescript_2.7",
)

local_repository(
  name = "package_typescript_28_e2e",
  path = "internal/e2e/package_typescript_2.8",
)

local_repository(
  name = "package_typescript_29_e2e",
  path = "internal/e2e/package_typescript_2.9",
)

local_repository(
  name = "package_typescript_30_e2e",
  path = "internal/e2e/package_typescript_3.0",
)

local_repository(
  name = "package_typescript_karma_e2e",
  path = "internal/e2e/package_typescript_karma",
)
