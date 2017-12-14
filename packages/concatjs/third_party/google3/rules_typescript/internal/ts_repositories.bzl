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

"""The ts_repositories rule installs build-time dependencies.
"""

load("@build_bazel_rules_nodejs//:defs.bzl", "npm_install")

def _ts_install_impl(repository_ctx):
  repository_ctx.file("BUILD", content="# Marker that this is a package")

  default_tsconfig = repository_ctx.attr.default_tsconfig
  if default_tsconfig != None:
    if not default_tsconfig.workspace_root:
      fail("""ts_repositories failed to install:
      default_tsconfig must be an absolute label, including workspace.
      For example, @my_project//:tsconfig.json""")

    # Wrap string value in quotes, but not None
    default_tsconfig = "Label(\"%s\")" % default_tsconfig
  repository_ctx.file("tsconfig.bzl", content="""
def get_default_tsconfig():
  return %s
""" % default_tsconfig)

_ts_install = repository_rule(implementation = _ts_install_impl, attrs = {
  "default_tsconfig": attr.label(allow_files = True, single_file = True),
})

def ts_repositories(default_tsconfig = None):
  """Installs the dependencies for TypeScript build rules.

  Args:
    default_tsconfig: a label pointing to a tsconfig.json file which will be
                      used for any ts_library rule which doesn't specify one.
  """
  _ts_install(
      name = "build_bazel_rules_typescript_install",
      default_tsconfig = default_tsconfig,
  )

  npm_install(
      name = "build_bazel_rules_typescript_deps",
      package_json = "@build_bazel_rules_typescript//internal/tsc_wrapped:package.json",
  )

  npm_install(
      name = "build_bazel_rules_typescript_devserver_deps",
      package_json = "@build_bazel_rules_typescript//internal/devserver:package.json",
  )

  npm_install(
      name = "build_bazel_rules_typescript_karma_deps",
      package_json = "@build_bazel_rules_typescript//internal/karma:package.json",
  )
