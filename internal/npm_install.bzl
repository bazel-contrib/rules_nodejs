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

"""Rules to install NodeJS dependencies during WORKSPACE evaluation."""

def _npm_install_impl(repository_ctx):
  """Core implementation of npm_install."""

  repository_ctx.file("BUILD", """
package(default_visibility = ["//visibility:public"])
filegroup(
    name = "node_modules",
    srcs = glob(["node_modules/**/*"],
        # Exclude directories that commonly contain filenames which are
        # illegal bazel labels
        exclude = ["node_modules/*/test/**"]))
""")

  # Put our package descriptor in the right place.
  repository_ctx.symlink(
      repository_ctx.attr.package_json,
      repository_ctx.path("package.json"))

  # TODO(https://github.com/bazelbuild/rules_nodejs/issues/77) this should run
  # node, not npm directly, as the latter will use #!/usr/bin/node
  if repository_ctx.os.name.lower().find("windows") != -1:
    npm = Label("@nodejs//:npm.cmd")
  else:
    npm = Label("@nodejs//:bin/npm")

  # To see the output, pass: quiet=False
  result = repository_ctx.execute(
    [repository_ctx.path(npm), "install", repository_ctx.path("")])

  if result.return_code:
    fail("npm_install failed: %s (%s)" % (result.stdout, result.stderr))

npm_install = repository_rule(
    attrs = {
        "package_json": attr.label(
            allow_files = True,
            mandatory = True,
            single_file = True,
        ),
    },
    implementation = _npm_install_impl,
)
