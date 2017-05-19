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

"""Install Yarn and run `yarn install` when the user calls yarn_install() from their WORKSPACE.

Yarn is a package manager that downloads dependencies. Yarn is an improvement over the `npm` tool in
speed and correctness.

We download a specific version of Yarn to ensure a hermetic build.
Then, using the package.json file supplied by the user, we call `yarn install`
to create or update a node_modules folder next to the package.json.
Finally we create a workspace that symlinks to the user's project.
We name this workspace "yarn" so there will be targets like
@yarn//installed:node_modules

Within the user's project, they can refer to //:node_modules
but from other repositories, like the @io_bazel_rules_typescript
repository, we also need to find some labels under node_modules.
"""

load(":executables.bzl", "get_node")

def _yarn_install_impl(ctx):
  project_dir = ctx.path(ctx.attr.package_json).dirname
  ctx.file("yarn_install.sh", """#!/bin/bash
set -ex
ROOT=$(dirname $1)
NODE=$2
YARN=$3
(cd $ROOT; $NODE $YARN install)
""")
  result = ctx.execute(["./yarn_install.sh",
                        ctx.path(ctx.attr.package_json),
                        ctx.path(ctx.attr._node),
                        ctx.path(ctx.attr._yarn)])
  if result.return_code > 0:
    print(result.stdout)
    print(result.stderr)

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
  ctx.symlink(project_dir, "installed")


_yarn_install = repository_rule(
    _yarn_install_impl,
    attrs = {
        "package_json": attr.label(),
        "_node": attr.label(default = get_node(), allow_files=True, single_file=True),
        "_yarn": attr.label(default = Label("@yarn_pkg//:bin/yarn.js")),
    },
)

def yarn_install(package_json):
    native.new_http_archive(
        name = "yarn_pkg",
        urls = [
            "http://mirror.bazel.build/github.com/yarnpkg/yarn/releases/download/v0.22.0/yarn-v0.22.0.tar.gz",
            "https://github.com/yarnpkg/yarn/releases/download/v0.22.0/yarn-v0.22.0.tar.gz",
        ],
        strip_prefix = "dist",
        type = "tar.gz",
        build_file_content = """
package(default_visibility = ["//visibility:public"])
exports_files(["bin/yarn"])
""",
    )

    _yarn_install(name = "yarn", package_json = package_json)

