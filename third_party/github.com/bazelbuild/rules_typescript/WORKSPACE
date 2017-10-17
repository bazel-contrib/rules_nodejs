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

git_repository(
    name = "build_bazel_rules_nodejs",
    remote = "https://github.com/bazelbuild/rules_nodejs",
    tag = "0.1.11",
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")

# Install a hermetic version of node.
# After this is run, these labels will be available:
# - The nodejs install:
#   @build_bazel_rules_typescript_node//:bin/node
#   @build_bazel_rules_typescript_node//:bin/npm
# - The yarn package manager:
#   @yarn//:yarn
node_repositories(package_json = ["//:package.json"])
