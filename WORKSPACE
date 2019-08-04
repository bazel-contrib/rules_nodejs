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
        "@npm_install_test": ["internal/npm_install/test/node_modules"],
    },
)

#
# Check that build is using a minimum compatible bazel version
#

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
# Since we don't have @npm//@bazel/foobar npm packages to setup
# the npm_bazel_foobar repositories, we set these up manually as
# local repositories.
#

local_repository(
    name = "npm_bazel_jasmine",
    path = "packages/jasmine/src",
)

local_repository(
    name = "npm_bazel_karma",
    path = "packages/karma/src",
)

local_repository(
    name = "npm_bazel_labs",
    path = "packages/labs/src",
)

local_repository(
    name = "npm_bazel_protractor",
    path = "packages/protractor/src",
)

local_repository(
    name = "npm_bazel_typescript",
    path = "packages/typescript/src",
)

local_repository(
    name = "npm_bazel_stylus",
    path = "packages/stylus/src",
)

local_repository(
    name = "npm_bazel_less",
    path = "packages/less/src",
)

#
# Install rules_nodejs dev dependencies
#

load("//:package.bzl", "rules_nodejs_dev_dependencies")

rules_nodejs_dev_dependencies()

#
# Setup rules_nodejs npm dependencies
#

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
    package_json = ["//:package.json"],
)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Install all Bazel dependencies needed for npm packages that supply Bazel rules
load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies()

#
# Install npm_bazel_typescript dependencies
#

load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

# Uncomment for local development
# local_repository(
#     name = "build_bazel_rules_typescript",
#     path = "../../../rules_typescript",
# )

# We use git_repository since Renovate knows how to update it.
# With http_archive it only sees releases/download/*.tar.gz urls
git_repository(
    name = "build_bazel_rules_typescript",
    commit = "a390e0a4b02baa93895ea9139fa13105d11258bd",
    remote = "http://github.com/bazelbuild/rules_typescript.git",
)

# We have a source dependency on build_bazel_rules_typescript
# so we must repeat its transitive toolchain deps
load("@npm_bazel_typescript//:package.bzl", "rules_typescript_dev_dependencies")

rules_typescript_dev_dependencies()

load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")
load("@io_bazel_rules_go//go:def.bzl", "go_register_toolchains", "go_rules_dependencies")

gazelle_dependencies()

go_rules_dependencies()

go_register_toolchains()

load("@build_bazel_rules_typescript//internal:ts_repositories.bzl", "ts_setup_dev_workspace")

ts_setup_dev_workspace()

load("@npm_bazel_typescript//internal:ts_repositories.bzl", "ts_setup_workspace")

ts_setup_workspace()

#
# Install npm_bazel_karma dependencies
#

load("@npm_bazel_karma//:package.bzl", "rules_karma_dependencies")

rules_karma_dependencies()

# Setup the rules_webtesting toolchain
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

# Temporary work-around for https://github.com/angular/angular/issues/28681
# TODO(gregmagolan): go back to @io_bazel_rules_webtesting browser_repositories
load("@npm_bazel_karma//:browser_repositories.bzl", "browser_repositories")

browser_repositories()

#
# Dependencies to run skydoc & generating documentation
#

load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")

sass_repositories()

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")

skydoc_repositories()

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")

protobuf_deps()

# Needed for starlark unit testing
load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()

#
# Setup local respositories & install npm dependencies for tests
#

local_repository(
    name = "examples_program",
    path = "examples/program",
)

local_repository(
    name = "internal_e2e_packages",
    path = "internal/e2e/packages",
)

local_repository(
    name = "internal_npm_package_test_vendored_external",
    path = "internal/npm_package/test/vendored_external",
)

load("@internal_e2e_packages//:setup_workspace.bzl", "internal_e2e_packages_setup_workspace")

internal_e2e_packages_setup_workspace()

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

yarn_install(
    name = "npm_install_test",
    manual_build_file_contents = """
filegroup(
  name = "test_files",
  srcs = [
    "//:BUILD.bazel",
    "//:install_bazel_dependencies.bzl",
    "//:manual_build_file_contents",
    "//:WORKSPACE",
    "//@angular/core:BUILD.bazel",
    "//@gregmagolan:BUILD.bazel",
    "//@gregmagolan/test-a/bin:BUILD.bazel",
    "//@gregmagolan/test-a:BUILD.bazel",
    "//@gregmagolan/test-b/bin:BUILD.bazel",
    "//@gregmagolan/test-b:BUILD.bazel",
    "//ajv:BUILD.bazel",
    "//jasmine/bin:BUILD.bazel",
    "//jasmine:BUILD.bazel",
    "//rxjs:BUILD.bazel",
    "//unidiff/bin:BUILD.bazel",
    "//unidiff:BUILD.bazel",
    "//zone.js:BUILD.bazel",
  ],
)""",
    package_json = "//internal/npm_install/test:package.json",
    yarn_lock = "//internal/npm_install/test:yarn.lock",
)

#
# RBE configuration
#

load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")

# Creates toolchain configuration for remote execution with BuildKite CI
# for rbe_ubuntu1604
rbe_autoconfig(
    name = "buildkite_config",
)

rbe_autoconfig(
    name = "rbe_default",
)

load("@build_bazel_integration_testing//tools:repositories.bzl", "bazel_binaries")

#depend on the Bazel binaries, also accepts an array of versions
bazel_binaries()
