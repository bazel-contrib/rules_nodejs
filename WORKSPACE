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

load("//:defs.bzl", "node_repositories")

local_repository(
    name = "program_example",
    path = "examples/program",
)
local_repository(
    name = "packages_example",
    path = "examples/packages",
)
# Install a hermetic version of node.
# After this is run, these labels will be available:
# - The nodejs install:
#   @nodejs//:bin/node
#   @nodejs//:bin/npm
# - The yarn package manager:
#   @yarn//:yarn
node_repositories(package_json = [
    "//:package.json",
    "//examples/rollup:package.json",
    "@program_example//:package.json",
    "//internal/test:package.json",
])

# Now the user must run either
# bazel run @yarn//:yarn
# or
# bazel run @nodejs//:npm

load("@packages_example//:setup_workspace.bzl", "packages_example_setup_workspace")

packages_example_setup_workspace()

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
