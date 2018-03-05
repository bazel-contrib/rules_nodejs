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

def _yarn_install_impl(repository_ctx):
  """Core implementation of yarn_install."""

  repository_ctx.file("BUILD", """
package(default_visibility = ["//visibility:public"])
filegroup(
    name = "node_modules",
    srcs = glob(["node_modules/**/*"],
        # Exclude directories that commonly contain filenames which are
        # illegal bazel labels
        exclude = [
            # e.g. node_modules/adm-zip/test/assets/attributes_test/New folder/hidden.txt
            "node_modules/**/test/**",
            # e.g. node_modules/xpath/docs/function resolvers.md
            "node_modules/**/docs/**",
            # e.g. node_modules/puppeteer/.local-chromium/mac-536395/chrome-mac/Chromium.app/Contents/Versions/66.0.3347.0/Chromium Framework.framework/Chromium Framework
            "node_modules/**/.*/**"
        ],
    ),
)
""")

  # Put our package descriptors in the right place.
  repository_ctx.symlink(
      repository_ctx.attr.package_json,
      repository_ctx.path("package.json"))
  if repository_ctx.attr.yarn_lock:
      repository_ctx.symlink(
          repository_ctx.attr.yarn_lock,
          repository_ctx.path("yarn.lock"))

  node = Label("@nodejs//:node")
  yarn = Label("@yarn//:bin/yarn.js")

  # This runs node, not yarn directly, as the latter will
  # look for a local node install (related to https://github.com/bazelbuild/rules_nodejs/issues/77).
  # A local cache is used as multiple yarn rules cannot run simultaneously using a shared
  # cache and a shared cache is non-hermetic.
  # To see the output, pass: quiet=False
  result = repository_ctx.execute([
    repository_ctx.path(node),
    repository_ctx.path(yarn),
    "--cache-folder",
    repository_ctx.path("_yarn_cache"),
    "--cwd",
    repository_ctx.path("")])

  if result.return_code:
    fail("yarn_install failed: %s (%s)" % (result.stdout, result.stderr))

yarn_install = repository_rule(
    attrs = {
        "package_json": attr.label(
            allow_files = True,
            mandatory = True,
            single_file = True,
        ),
        "yarn_lock": attr.label(
            allow_files = True,
            mandatory = True,
            single_file = True,
        ),
    },
    implementation = _yarn_install_impl,
)
