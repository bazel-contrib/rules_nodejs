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
    name = "node_loader_e2e_no_preserve_symlinks",
    path = "internal/e2e/node_loader_no_preserve_symlinks",
)

local_repository(
    name = "node_loader_e2e_preserve_symlinks",
    path = "internal/e2e/node_loader_preserve_symlinks",
)

local_repository(
    name = "node_resolve_dep",
    path = "internal/test/node_resolve_dep",
)

load("//:defs.bzl", "node_repositories")

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
        "//internal/test:package.json"
    ],
    preserve_symlinks = True,
)

# Now the user must run either
# bazel run @nodejs//:yarn
# or
# bazel run @nodejs//:npm

load("@packages_example//:setup_workspace.bzl", "packages_example_setup_workspace")

packages_example_setup_workspace()

load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")
sass_repositories()

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")
skydoc_repositories()
