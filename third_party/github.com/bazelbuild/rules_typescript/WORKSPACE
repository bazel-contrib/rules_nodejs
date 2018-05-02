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

http_archive(
    name = "build_bazel_rules_nodejs",
    url = "https://github.com/bazelbuild/rules_nodejs/archive/0.5.3.zip",
    strip_prefix = "rules_nodejs-0.5.3",
    sha256 = "17a5515f59777b00cb25dbc710017a14273f825029b2ec60e0969d28914870be",
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "yarn_install")

# Use a bazel-managed npm dependency, allowing us to test resolution to these paths
yarn_install(
    name = "build_bazel_rules_typescript_internal_bazel_managed_deps",
    package_json = "//examples/bazel_managed_deps:package.json",
    yarn_lock = "//examples/bazel_managed_deps:yarn.lock",
)

# Install a hermetic version of node.
# After this is run, these labels will be available:
# - The nodejs install:
#   @build_bazel_rules_typescript_node//:bin/node
#   @build_bazel_rules_typescript_node//:bin/npm
# - The yarn package manager:
#   @yarn//:yarn
node_repositories(package_json = ["//:package.json"])

load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")

ts_setup_workspace()

http_archive(
    name = "io_bazel_rules_go",
    url = "https://github.com/bazelbuild/rules_go/releases/download/0.7.1/rules_go-0.7.1.tar.gz",
    sha256 = "341d5eacef704415386974bc82a1783a8b7ffbff2ab6ba02375e1ca20d9b031c",
)

load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")

go_rules_dependencies()

go_register_toolchains()

http_archive(
    name = "io_bazel",
    url = "https://github.com/bazelbuild/bazel/releases/download/0.9.0/bazel-0.9.0-dist.zip",
    sha256 = "efb28fed4ffcfaee653e0657f6500fc4cbac61e32104f4208da385676e76312a",
)

#############################################
# Dependencies for generating documentation #
#############################################

http_archive(
    name = "io_bazel_rules_sass",
    url = "https://github.com/bazelbuild/rules_sass/archive/0.0.3.zip",
    strip_prefix = "rules_sass-0.0.3",
    sha256 = "8fa98e7b48a5837c286a1ea254b5a5c592fced819ee9fe4fdd759768d97be868",
)
load("@io_bazel_rules_sass//sass:sass.bzl", "sass_repositories")
sass_repositories()

http_archive(
    name = "bazel_skylib",
    url = "https://github.com/bazelbuild/bazel-skylib/archive/0.3.1.zip",
    strip_prefix = "bazel-skylib-0.3.1",
)

http_archive(
    name = "io_bazel_skydoc",
    url = "https://github.com/bazelbuild/skydoc/archive/0ef7695c9d70084946a3e99b89ad5a99ede79580.zip",
    strip_prefix = "skydoc-0ef7695c9d70084946a3e99b89ad5a99ede79580",
)
load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")
skydoc_repositories()
