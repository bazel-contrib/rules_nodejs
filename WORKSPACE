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

workspace(name = "io_bazel_rules_typescript")

load("//:defs.bzl", "node_repositories", "yarn_check")

# Install a hermetic version of node.
# After this is run, label @io_bazel_rules_typescript_node//:bin/node will exist
node_repositories()

# Install yarn, and check the node_modules directory.
# After this is run, label @npm//installed:node_modules will exist.
# (But your rules can reference //:node_modules instead)
# Note, you could use npm_install as an alternative
yarn_check(yarn_lock = "//:yarn.lock")
