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
    name = "rules_nodejs",
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

#
# Install rules_nodejs dev dependencies
#

load("//:repositories.bzl", "rules_nodejs_dev_dependencies")

rules_nodejs_dev_dependencies()

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
    name = "node17",
    node_version = "17.9.1",
)

http_archive(
    name = "npm_typescript",
    build_file = "typescript.BUILD",
    sha256 = "6e2faae079c9047aa921e8a307f0cec0da4dc4853e20bb31d18acc678f5bf505",
    urls = ["https://registry.npmjs.org/typescript/-/typescript-4.9.5.tgz"],
)

http_archive(
    name = "npm_types_node",
    build_file = "types_node.BUILD",
    sha256 = "6ef16adadc11a80601c023e1271887425c5c5c1867266d35493c7e92d7cc00fa",
    urls = ["https://registry.npmjs.org/@types/node/-/node-16.18.23.tgz"],
)

#
# Dependencies to run stardoc & generating documentation
#

load("@aspect_bazel_lib//lib:repositories.bzl", "aspect_bazel_lib_dependencies")

aspect_bazel_lib_dependencies()

# Needed for starlark unit testing
load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()
