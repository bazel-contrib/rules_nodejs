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

"""Install NodeJS when the user runs node_repositories() from their WORKSPACE.

We fetch a specific version of Node, to ensure builds are hermetic.
We then create a repository @io_bazel_rules_typescript_node which provides the
node binary to other rules.
"""

def _node_impl(repository_ctx):
  repository_ctx.file("BUILD", content="""
package(default_visibility = ["//visibility:public"])
exports_files([
  "bin/node",
  "bin/npm",
])
""")
  repository_ctx.file("BUILD.bazel", content="""
package(default_visibility = ["//visibility:public"])
exports_files([
  "bin/node",
  "bin/npm",
])
""")

  os_name = repository_ctx.os.name.lower()
  if os_name.startswith("mac os"):
    repository_ctx.download_and_extract(
        [
            "http://mirror.bazel.build/nodejs.org/dist/v6.10.2/node-v6.10.2-darwin-x64.tar.xz",
            "https://nodejs.org/dist/v6.10.2/node-v6.10.2-darwin-x64.tar.xz",
        ],
        stripPrefix = "node-v6.10.2-darwin-x64",
        sha256 = "360b887361b2597613f18968e3fc0e920079a363d0535fc4e40532e3426fc6eb"
    )
  elif os_name.find("windows") != -1:
    repository_ctx.download_and_extract(
        [
            "http://mirror.bazel.build/nodejs.org/dist/v6.10.2/node-v6.10.2-win-x64.zip",
            "http://nodejs.org/dist/v6.10.2/node-v6.10.2-win-x64.zip",
        ],
        stripPrefix = "node-v6.10.2-win-x64",
        sha256 = "d778ed84685c6604192cfcf40192004e27fb11c9e65c3ce4b283d90703b4192c"
    )
  else:
    repository_ctx.download_and_extract(
        [
            "http://mirror.bazel.build/nodejs.org/dist/v6.10.2/node-v6.10.2-linux-x64.tar.xz",
            "http://nodejs.org/dist/v6.10.2/node-v6.10.2-linux-x64.tar.xz",
        ],
        stripPrefix = "node-v6.10.2-linux-x64",
        sha256 = "b519cd616b0671ab789d2645c5c026deb7e016d73a867ab4b1b8c9ceba9c3503"
    )

_node_repo = repository_rule(_node_impl, attrs = {})

def node_repositories():
  _node_repo(name = "io_bazel_rules_typescript_node")
