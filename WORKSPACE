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
        "@angular_deps": ["packages/angular/node_modules"],
        # cypress_deps must be a managed directory to ensure it is downloaded before cypress_repositories is run.
        "@cypress_deps": ["packages/cypress/test/node_modules"],
        "@internal_npm_install_test_patches_npm_symlinked": ["internal/npm_install/test/patches_npm_symlinked/node_modules"],
        "@internal_npm_install_test_patches_yarn_symlinked": ["internal/npm_install/test/patches_yarn_symlinked/node_modules"],
        "@internal_test_multi_linker_sub_deps": ["internal/linker/test/multi_linker/sub/node_modules"],
        "@npm": ["node_modules"],
        "@npm_node_patches": ["packages/node-patches/node_modules"],
    },
)

load("//:index.bzl", "BAZEL_VERSION", "SUPPORTED_BAZEL_VERSIONS", "node_repositories")

node_repositories(
    node_version = "16.5.0",
)

#
# Install rules_nodejs dev dependencies
#

load("//:package.bzl", "rules_nodejs_dev_dependencies")

rules_nodejs_dev_dependencies()

#
# Setup local respositories
#

local_repository(
    name = "build_bazel_rules_typescript",
    path = "third_party/github.com/bazelbuild/rules_typescript",
)

local_repository(
    name = "internal_npm_package_test_vendored_external",
    path = "internal/pkg_npm/test/vendored_external",
)

#
# Setup rules_nodejs npm dependencies
#

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

# We have a source dependency on build_bazel_rules_typescript
# so we must repeat its transitive toolchain deps
load("@build_bazel_rules_typescript//:package.bzl", "rules_typescript_dev_dependencies")

rules_typescript_dev_dependencies()

# Install labs dependencies
load("//packages/labs:package.bzl", "npm_bazel_labs_dependencies")

npm_bazel_labs_dependencies()

load("@rules_proto//proto:repositories.bzl", "rules_proto_dependencies", "rules_proto_toolchains")

rules_proto_dependencies()

rules_proto_toolchains()

load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")

go_rules_dependencies()

go_register_toolchains(version = "1.16")

gazelle_dependencies()

load("@build_bazel_rules_typescript//internal:ts_repositories.bzl", "ts_setup_dev_workspace")

ts_setup_dev_workspace()

#
# Install @bazel/cypress dependencies
#
load("//packages/cypress:index.bzl", "cypress_repositories")

cypress_repositories(
    name = "cypress",
    darwin_sha256 = "101a0ced77fb74b356800cb3a3919f5288d23cc63fdd39a0c500673159e954fc",
    linux_sha256 = "d8ea8d16fed33fdae8f17178bcae076aaf532fa7ccb48f377df1f143e60abd59",
    version = "7.3.0",
    windows_sha256 = "8a8809e4fd22fe7bfc3103c39df3f4fce9db0964450ce927558e9a09558cb26c",
)

# Setup the rules_webtesting toolchain
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

load("@io_bazel_rules_webtesting//web/versioned:browsers-0.3.2.bzl", "browser_repositories")

browser_repositories(
    chromium = True,
    firefox = True,
)

# Setup esbuild dependencies
load("//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories()

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

load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")

# Creates toolchain configuration for remote execution with BuildKite CI
# for rbe_ubuntu1604
rbe_autoconfig(
    name = "buildkite_config",
)

rbe_autoconfig(
    name = "rbe_default",
    bazel_version = BAZEL_VERSION,
)

load("@build_bazel_integration_testing//tools:repositories.bzl", "bazel_binaries")

# Depend on the Bazel binaries
bazel_binaries(versions = SUPPORTED_BAZEL_VERSIONS)
