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

"""Helper functions to get node and npm labels in @nodejs repository.

Labels are different on windows and linux/OSX.
"""

def get_node_label(repository_ctx):
  if repository_ctx.os.name.lower().find("windows") != -1:
    # The windows distribution of nodejs has the binaries in different paths
    node = Label("@nodejs//:node.exe")
  else:
    node = Label("@nodejs//:bin/node")
  return node

def get_npm_label(repository_ctx):
  if repository_ctx.os.name.lower().find("windows") != -1:
    # The windows distribution of nodejs has the binaries in different paths
    npm = Label("@nodejs//:node_modules/npm/bin/npm-cli.js")
  else:
    npm = Label("@nodejs//:bin/npm")
  return npm
