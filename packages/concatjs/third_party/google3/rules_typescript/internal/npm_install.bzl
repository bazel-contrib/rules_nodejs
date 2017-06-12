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

"""Run `npm install` when the user calls npm_install() from their WORKSPACE.

Using the package.json file supplied by the user, we call `npm install`
to create or update a node_modules folder next to the package.json.
Finally we create a workspace that symlinks to the user's project.
We name this workspace "npm" so there will be targets like
@npm//installed:node_modules

Within the user's project, they can refer to //:node_modules
but from other repositories, like the @io_bazel_rules_typescript
repository, we also need to find some labels under node_modules.
"""

load(":executables.bzl", "get_node")

def _npm_install_impl(ctx):
  project_dir = ctx.path(ctx.attr.package_json).dirname
  ctx.file("npm_install.sh", """#!/bin/bash
set -ex
ROOT=$(dirname $1)
NODE=$2
SCRIPT=$3
(cd $ROOT; $NODE $SCRIPT install)
""")
  result = ctx.execute(["./npm_install.sh",
                        ctx.path(ctx.attr.package_json),
                        ctx.path(ctx.attr._node),
                        ctx.path(ctx.attr._npm)])
  if result.return_code > 0:
    print(result.stdout)
    print(result.stderr)

  # WORKAROUND for https://github.com/bazelbuild/bazel/issues/374#issuecomment-296217940
  # See comments in yarn_install.bzl
  # Instead symlink the root directory from the user's workspace
  ctx.symlink(project_dir, "installed")


_npm_install = repository_rule(
    _npm_install_impl,
    attrs = {
        "package_json": attr.label(),
        "_node": attr.label(default = get_node(), allow_files=True, single_file=True),
        "_npm": attr.label(default = Label("@io_bazel_rules_typescript_node//:bin/npm")),
    },
)

def npm_install(package_json):
    _npm_install(name = "npm", package_json = package_json)
