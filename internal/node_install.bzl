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

Finally we create a workspace that symlinks to the user's project.
We name this workspace "npm" so there will be targets like
@npm//installed:node_modules

Within the user's project, they can refer to //:node_modules
but from other repositories, like the @io_bazel_rules_typescript
repository, we also need to find some labels under node_modules.
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

def _symlink_node_modules_impl(ctx):
  # WORKAROUND for https://github.com/bazelbuild/bazel/issues/374#issuecomment-296217940
  # Bazel does not allow labels to start with `@`, so when installing eg. the `@types/node`
  # module from the @types scoped package, you'll get an error.
  # The workaround is to move the rule up one level, from /node_modules to the project root.
  # For now, users must instead write their own /BUILD file on setup.

  # ctx.symlink(project_dir.get_child("node_modules"), "node_modules")
  # add a BUILD file inside the user's node_modules project folder
  # ctx.file("installed/BUILD", """
  #   filegroup(name = "node_modules", srcs = glob(["node_modules/**/*"]), visibility = ["//visibility:public"])
  # """)

  # Instead symlink the root directory from the user's workspace
  project_dir = ctx.path(ctx.attr.package_json).dirname
  ctx.symlink(project_dir, "installed")

_symlink_node_modules = repository_rule(
    _symlink_node_modules_impl,
    attrs = { "package_json": attr.label() },
)

def _yarn_impl(ctx):
  # Yarn is a package manager that downloads dependencies. Yarn is an improvement over the `npm` tool in
  # speed and correctness. We download a specific version of Yarn to ensure a hermetic build.
  ctx.file("BUILD.bazel", """
package(default_visibility = ["//visibility:public"])
exports_files(['yarn.sh'])
alias(name = "yarn", actual = ":yarn.sh")
""")
  ctx.file("yarn.sh", """#!/bin/bash
ROOT="$(dirname "{}")"
NODE="{}"
SCRIPT="{}"
(cd "$ROOT"; "$NODE" "$SCRIPT" "$@")
""".format(
    ctx.path(ctx.attr.package_json),
    ctx.path(ctx.attr._node),
    ctx.path("bin/yarn.js")), executable = True)
  ctx.download_and_extract(
      [
          "http://mirror.bazel.build/github.com/yarnpkg/yarn/releases/download/v0.22.0/yarn-v0.22.0.tar.gz",
          "https://github.com/yarnpkg/yarn/releases/download/v0.22.0/yarn-v0.22.0.tar.gz",
      ],
      stripPrefix = "dist",
      sha256 = "e295042279b644f2bc3ea3407a2b2fb417a200d35590b0ec535422d21cf19a09"
  )

load(":executables.bzl", "get_node")

_yarn_repo = repository_rule(
    _yarn_impl,
    attrs = {
        "package_json": attr.label(),
        "_node": attr.label(default = get_node(), allow_files=True, single_file=True),
     },
)

def node_repositories(package_json):
  _node_repo(name = "io_bazel_rules_typescript_node")

  _yarn_repo(name = "yarn", package_json = package_json)

  # This repo is named "npm" since that's the namespace of packages.
  _symlink_node_modules(name = "npm", package_json = package_json)
