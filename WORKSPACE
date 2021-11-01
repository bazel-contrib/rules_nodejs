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
        # cypress_deps must be a managed directory to ensure it is downloaded before cypress_repository is run.
        "@cypress_deps": ["packages/cypress/test/node_modules"],
        "@internal_test_multi_linker_sub_deps": ["internal/linker/test/multi_linker/sub/node_modules"],
        "@npm": ["node_modules"],
        "@npm_node_patches": ["packages/node-patches/node_modules"],
    },
)

load("//:index.bzl", "BAZEL_VERSION", "SUPPORTED_BAZEL_VERSIONS")

#
# Install rules_nodejs dev dependencies
#

load("//:package.bzl", "rules_nodejs_dev_dependencies")

rules_nodejs_dev_dependencies()

local_repository(
    name = "build_bazel_rules_typescript",
    path = "third_party/github.com/bazelbuild/rules_typescript",
)

#
# Setup rules_nodejs npm dependencies
#

load("@build_bazel_rules_nodejs//:index.bzl", "npm_install", "yarn_install")

yarn_install(
    name = "npm",
    data = [
        "//:patches/jest-haste-map+25.3.0.patch",
        "//internal/npm_install/test:postinstall.js",
    ],
    environment = {
        "SOME_USER_ENV": "yarn is great!",
    },
    links = {
        "@test_multi_linker/lib-a": "//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-a2": "//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-b": "@//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-b2": "@//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-c": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-c2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-d": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
        "@test_multi_linker/lib-d2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
    },
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_deps",
    links = {
        "@test_multi_linker/lib-a": "@//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-a2": "@//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-b": "@//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-b2": "@//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-c": "@//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-c2": "@//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-d": "@//internal/linker/test/multi_linker/lib_d",
        "@test_multi_linker/lib-d2": "@//internal/linker/test/multi_linker/lib_d",
    },
    package_json = "//internal/linker/test/multi_linker:package.json",
    package_path = "internal/linker/test/multi_linker",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_test_a_deps",
    links = {
        "@test_multi_linker/lib-a": "@//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-a2": "@//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-b": "@//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-b2": "@//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-c": "@//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-c2": "@//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-d": "@//internal/linker/test/multi_linker/lib_d",
        "@test_multi_linker/lib-d2": "@//internal/linker/test/multi_linker/lib_d",
    },
    package_json = "//internal/linker/test/multi_linker/test_a:package.json",
    package_path = "internal/linker/test/multi_linker/test_a",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/test_a:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_test_b_deps",
    package_json = "//internal/linker/test/multi_linker/test_b:package.json",
    package_path = "internal/linker/test/multi_linker/test_b",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/test_b:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_test_c_deps",
    package_json = "//internal/linker/test/multi_linker/test_c:package.json",
    package_path = "internal/linker/test/multi_linker/test_c",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/test_c:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_test_d_deps",
    package_json = "//internal/linker/test/multi_linker/test_d:package.json",
    package_path = "internal/linker/test/multi_linker/test_d",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/test_d:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_lib_b_deps",
    # transitive deps for this first party lib should not include dev dependencies
    args = ["--production"],
    package_json = "//internal/linker/test/multi_linker/lib_b:package.json",
    package_path = "internal/linker/test/multi_linker/lib_b",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/lib_b:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_lib_c_deps",
    # transitive deps for this first party lib should not include dev dependencies
    args = ["--production"],
    package_json = "//internal/linker/test/multi_linker/lib_c:lib/package.json",
    package_path = "internal/linker/test/multi_linker/lib_c/lib",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/lib_c:lib/yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_sub_dev_deps",
    links = {
        "@test_multi_linker/lib-a": "//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-a2": "//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-b": "//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-b2": "//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-c": "//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-c2": "//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-d": "//internal/linker/test/multi_linker/lib_d",
        "@test_multi_linker/lib-d2": "//internal/linker/test/multi_linker/lib_d",
    },
    package_json = "//internal/linker/test/multi_linker/sub:package.json",
    package_path = "internal/linker/test/multi_linker/sub/dev",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/sub:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_sub_deps",
    # transitive deps for this first party lib should not include dev dependencies
    args = ["--production"],
    links = {
        "@test_multi_linker/lib-a": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-a2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_a",
        "@test_multi_linker/lib-b": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-b2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_b",
        "@test_multi_linker/lib-c": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-c2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
        "@test_multi_linker/lib-d": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
        "@test_multi_linker/lib-d2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
    },
    package_json = "//internal/linker/test/multi_linker/sub:package.json",
    package_path = "internal/linker/test/multi_linker/sub",
    yarn_lock = "//internal/linker/test/multi_linker/sub:yarn.lock",
)

yarn_install(
    name = "internal_test_multi_linker_onep_a_deps",
    # transitive deps for this first party lib should not include dev dependencies
    args = ["--production"],
    package_json = "//internal/linker/test/multi_linker/onep_a:package.json",
    package_path = "internal/linker/test/multi_linker/onep_a",
    symlink_node_modules = False,
    yarn_lock = "//internal/linker/test/multi_linker/onep_a:yarn.lock",
)

npm_install(
    name = "npm_node_patches",
    package_json = "//packages/node-patches:package.json",
    package_lock_json = "//packages/node-patches:package-lock.json",
)

load("@build_bazel_rules_nodejs//internal/npm_tarballs:translate_package_lock.bzl", "translate_package_lock")

# Translate our package.lock file from JSON to Starlark
translate_package_lock(
    name = "npm_node_patches_lock",
    package_lock = "//packages/node-patches:package-lock.json",
)

load("@npm_node_patches_lock//:index.bzl", _npm_patches_repositories = "npm_repositories")

# # Declare an external repository for each npm package fetchable by the lock file
_npm_patches_repositories()

npm_install(
    name = "angular_deps",
    package_json = "//packages/angular:package.json",
    package_lock_json = "//packages/angular:package-lock.json",
)

yarn_install(
    name = "cypress_deps",
    package_json = "//packages/cypress/test:package.json",
    yarn_lock = "//packages/cypress/test:yarn.lock",
)

yarn_install(
    name = "rollup_test_multi_linker_deps",
    package_json = "//packages/rollup/test/multi_linker:package.json",
    package_path = "packages/rollup/test/multi_linker",
    symlink_node_modules = False,
    yarn_lock = "//packages/rollup/test/multi_linker:yarn.lock",
)

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

load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")
load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")

gazelle_dependencies()

go_rules_dependencies()

go_register_toolchains()

load("@build_bazel_rules_typescript//internal:ts_repositories.bzl", "ts_setup_dev_workspace")

ts_setup_dev_workspace()

#
# Install @bazel/cypress dependencies
#
load("//packages/cypress:index.bzl", "cypress_repository")

cypress_repository(
    name = "cypress",
    cypress_bin = "@cypress_deps//:node_modules/cypress/bin/cypress",
    # Currently cypress cannot be installed on our Linux/Windows CI machines
    fail_on_error = False,
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
load("//packages/esbuild:esbuild_repo.bzl", "esbuild_dependencies")

esbuild_dependencies()

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
# Setup local respositories & install npm dependencies for tests
#

local_repository(
    name = "internal_npm_package_test_vendored_external",
    path = "internal/pkg_npm/test/vendored_external",
)

yarn_install(
    name = "fine_grained_deps_yarn",
    data = [
        "//:tools/npm_packages/local_module/yarn/BUILD.bazel",
        "//:tools/npm_packages/local_module/yarn/index.js",
        "//:tools/npm_packages/local_module/yarn/package.json",
        "//internal/npm_install/test:postinstall.js",
    ],
    environment = {
        "SOME_USER_ENV": "yarn is great!",
    },
    generate_local_modules_build_files = False,
    included_files = [
        "",
        ".js",
        ".d.ts",
        ".json",
        ".proto",
    ],
    package_json = "//:tools/fine_grained_deps_yarn/package.json",
    symlink_node_modules = False,
    yarn_lock = "//:tools/fine_grained_deps_yarn/yarn.lock",
)

npm_install(
    name = "fine_grained_deps_npm",
    data = [
        "//:tools/npm_packages/local_module/npm/BUILD.bazel",
        "//:tools/npm_packages/local_module/npm/index.js",
        "//:tools/npm_packages/local_module/npm/package.json",
        "//internal/npm_install/test:postinstall.js",
    ],
    environment = {
        "SOME_USER_ENV": "npm is cool!",
    },
    generate_local_modules_build_files = False,
    included_files = [
        "",
        ".js",
        ".d.ts",
        ".json",
        ".proto",
    ],
    npm_command = "install",
    package_json = "//:tools/fine_grained_deps_npm/package.json",
    package_lock_json = "//:tools/fine_grained_deps_npm/package-lock.json",
    symlink_node_modules = False,
)

yarn_install(
    name = "fine_grained_no_bin",
    package_json = "//:tools/fine_grained_no_bin/package.json",
    symlink_node_modules = False,
    yarn_lock = "//:tools/fine_grained_no_bin/yarn.lock",
)

yarn_install(
    name = "fine_grained_goldens",
    included_files = [
        "",
        ".js",
        ".jst",
        ".ts",
        ".map",
        ".d.ts",
        ".json",
        ".proto",
    ],
    links = {
        "@some-scope/some-target-b": "@//some/target/b",
        "@some-scope/some-target-b2": "@//some/target/b",
        "some-target-a": "//some/target/a",
        "some-target-a2": "//some/target/a",
    },
    manual_build_file_contents = """
filegroup(
  name = "golden_files",
  srcs = [
    "//:BUILD.bazel",
    "//:manual_build_file_contents",
    "//:WORKSPACE",
    "//@angular/core:BUILD.bazel",
    "//@gregmagolan:BUILD.bazel",
    "//@gregmagolan/test-a/bin:BUILD.bazel",
    "//@gregmagolan/test-a:BUILD.bazel",
    "//@gregmagolan/test-a:index.bzl",
    "//@gregmagolan/test-b:BUILD.bazel",
    "//ajv:BUILD.bazel",
    "//jasmine/bin:BUILD.bazel",
    "//jasmine:BUILD.bazel",
    "//jasmine:index.bzl",
    "//rxjs:BUILD.bazel",
    "//unidiff:BUILD.bazel",
    "//zone.js:BUILD.bazel",
    "//some-target-a:BUILD.bazel",
    "//some-target-a2:BUILD.bazel",
    "//@some-scope/some-target-b:BUILD.bazel",
    "//@some-scope/some-target-b2:BUILD.bazel",
  ],
)""",
    package_json = "//:tools/fine_grained_goldens/package.json",
    symlink_node_modules = False,
    yarn_lock = "//:tools/fine_grained_goldens/yarn.lock",
)

yarn_install(
    name = "internal_npm_install_test_patches_yarn",
    package_json = "//internal/npm_install/test/patches_yarn:package.json",
    package_path = "internal/npm_install/test/patches_yarn",
    patch_args = ["-p0"],
    patch_tool = "patch",
    post_install_patches = ["//internal/npm_install/test/patches_yarn:semver+1.0.0.patch"],
    pre_install_patches = ["//internal/npm_install/test/patches_yarn:package_json.patch"],
    symlink_node_modules = False,
    yarn_lock = "//internal/npm_install/test/patches_yarn:yarn.lock",
)

npm_install(
    name = "internal_npm_install_test_patches_npm",
    package_json = "//internal/npm_install/test/patches_npm:package.json",
    package_lock_json = "//internal/npm_install/test/patches_npm:package-lock.json",
    package_path = "internal/npm_install/test/patches_npm",
    patch_args = ["-p0"],
    patch_tool = "patch",
    post_install_patches = ["//internal/npm_install/test/patches_npm:semver+1.0.0.patch"],
    pre_install_patches = ["//internal/npm_install/test/patches_npm:package_json.patch"],
    symlink_node_modules = False,
)

yarn_install(
    name = "fine_grained_goldens_multi_linked",
    included_files = [
        "",
        ".js",
        ".jst",
        ".ts",
        ".map",
        ".d.ts",
        ".json",
        ".proto",
    ],
    links = {
        "@some-scope/some-target-b": "@//some/target/b",
        "@some-scope/some-target-b2": "@//some/target/b",
        "some-target-a": "@build_bazel_rules_nodejs//some/target/a",
        "some-target-a2": "@build_bazel_rules_nodejs//some/target/a",
    },
    manual_build_file_contents = """
filegroup(
  name = "golden_files",
  srcs = [
    "//:BUILD.bazel",
    "//:manual_build_file_contents",
    "//:WORKSPACE",
    "//@angular/core:BUILD.bazel",
    "//@gregmagolan:BUILD.bazel",
    "//@gregmagolan/test-a/bin:BUILD.bazel",
    "//@gregmagolan/test-a:BUILD.bazel",
    "//@gregmagolan/test-a:index.bzl",
    "//@gregmagolan/test-b:BUILD.bazel",
    "//ajv:BUILD.bazel",
    "//jasmine/bin:BUILD.bazel",
    "//jasmine:BUILD.bazel",
    "//jasmine:index.bzl",
    "//rxjs:BUILD.bazel",
    "//unidiff:BUILD.bazel",
    "//zone.js:BUILD.bazel",
    "//some-target-a:BUILD.bazel",
    "//some-target-a2:BUILD.bazel",
    "//@some-scope/some-target-b:BUILD.bazel",
    "//@some-scope/some-target-b2:BUILD.bazel",
  ],
)""",
    package_json = "//:tools/fine_grained_goldens/package.json",
    package_path = "tools/fine_grained_goldens",
    symlink_node_modules = False,
    yarn_lock = "//:tools/fine_grained_goldens/yarn.lock",
)

yarn_install(
    name = "multi_root_deps_yarn",
    package_json = "//:tools/multi_root_deps_yarn/package.json",
    symlink_node_modules = False,
    yarn_lock = "//:tools/multi_root_deps_yarn/yarn.lock",
)

npm_install(
    name = "multi_root_deps_npm",
    npm_command = "install",
    package_json = "//:tools/multi_root_deps_npm/package.json",
    package_lock_json = "//:tools/multi_root_deps_npm/package-lock.json",
    symlink_node_modules = False,
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
    bazel_version = BAZEL_VERSION,
)

load("@build_bazel_integration_testing//tools:repositories.bzl", "bazel_binaries")

# Depend on the Bazel binaries
bazel_binaries(versions = SUPPORTED_BAZEL_VERSIONS)
