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
)

#
# Setup local respositories
#

local_repository(
    name = "rules_nodejs",
    path = ".",
)

#
# Install rules_nodejs dev dependencies
#

load("//:repositories.bzl", "build_bazel_rules_nodejs_dev_dependencies")

build_bazel_rules_nodejs_dev_dependencies()

#
# Setup rules_nodejs npm dependencies
#

load("@rules_nodejs//nodejs:repositories.bzl", "nodejs_register_toolchains")

# The order matters because Bazel will provide the first registered toolchain when a rule asks Bazel to select it
# This applies to the resolved_toolchain
nodejs_register_toolchains(
    name = "node16",
    node_version = "16.5.0",
)

nodejs_register_toolchains(
    name = "node15",
    node_version = "15.14.0",
)

load("@rules_nodejs//nodejs:yarn_repositories.bzl", "yarn_repositories")

yarn_repositories(
    name = "yarn",
    node_repository = "node16",
)

load("@build_bazel_rules_nodejs//:npm_deps.bzl", "npm_deps")

npm_deps()

load("@build_bazel_rules_nodejs//internal/npm_tarballs:translate_package_lock.bzl", "translate_package_lock")

# Translate our package.lock file from JSON to Starlark
translate_package_lock(
    name = "npm_node_patches_lock",
    package_lock = "//packages/node-patches:package-lock.json",
)

load("@npm_node_patches_lock//:index.bzl", _npm_patches_repositories = "npm_repositories")

# Declare an external repository for each npm package fetchable by the lock file
_npm_patches_repositories()

# Setup the rules_webtesting toolchain
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

load("@io_bazel_rules_webtesting//web/versioned:browsers-0.3.3.bzl", "browser_repositories")

browser_repositories(
    chromium = True,
    firefox = True,
)

#
# Dependencies to run stardoc & generating documentation
#

load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")

sass_repositories()

load("@io_bazel_stardoc//:setup.bzl", "stardoc_repositories")

stardoc_repositories()

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")

protobuf_deps()

load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")

rules_pkg_dependencies()

# Needed for starlark unit testing
load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()

#
# RBE configuration
#

load("//:index.bzl", "SUPPORTED_BAZEL_VERSIONS")
load("@bazelci_rules//:rbe_repo.bzl", "rbe_preconfig")

# Creates toolchain configuration for remote execution with BuildKite CI
# for rbe_ubuntu1604
rbe_preconfig(
    name = "buildkite_config",
    toolchain = "ubuntu1804-bazel-java11",
)

rbe_preconfig(
    name = "rbe_default",
    toolchain = "ubuntu1804-bazel-java11",
)

load("@build_bazel_integration_testing//tools:repositories.bzl", "bazel_binaries")

# Depend on the Bazel binaries
bazel_binaries(versions = SUPPORTED_BAZEL_VERSIONS)
