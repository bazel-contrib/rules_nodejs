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

"""Install npm packages

Rules to install NodeJS dependencies during WORKSPACE evaluation.
This happens before the first build or test runs, allowing you to use Bazel
as the package manager.

See discussion in the README.
"""

load("//internal/node:node_labels.bzl", "get_node_label", "get_npm_label", "get_yarn_label")
load("//internal/common:os_name.bzl", "os_name")

def _create_build_file(repository_ctx, node):
  if repository_ctx.attr.manual_build_file_contents:
    repository_ctx.file("BUILD.bazel", repository_ctx.attr.manual_build_file_contents)
  else:
    repository_ctx.template("internal/generate_build_file.js",
        repository_ctx.path(Label("//internal/npm_install:generate_build_file.js")), {})
    result = repository_ctx.execute([node, "internal/generate_build_file.js"])
    if result.return_code:
      fail("node failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

def _add_data_dependencies(repository_ctx):
  """Add data dependencies to the repository."""
  for f in repository_ctx.attr.data:
    to = []
    if f.package:
      to += [f.package]
    to += [f.name]
    repository_ctx.symlink(f, repository_ctx.path("/".join(to)))

def _npm_install_impl(repository_ctx):
  """Core implementation of npm_install."""

  is_windows = os_name(repository_ctx).find("windows") != -1
  node = repository_ctx.path(get_node_label(repository_ctx))
  npm = get_npm_label(repository_ctx)
  npm_args = ["install"]

  # The entry points for npm install for osx/linux and windows
  if not is_windows:
    repository_ctx.file("npm", content="""#!/bin/bash
(cd "{root}"; "{npm}" {npm_args})
""".format(
    root = repository_ctx.path(""),
    npm = repository_ctx.path(npm),
    npm_args = " ".join(npm_args)),
    executable = True)
  else:
    repository_ctx.file("npm.cmd", content="""@echo off
cd "{root}" && "{npm}" {npm_args}
""".format(
    root = repository_ctx.path(""),
    npm = repository_ctx.path(npm),
    npm_args = " ".join(npm_args)),
    executable = True)

  # Put our package descriptors in the right place.
  repository_ctx.symlink(
      repository_ctx.attr.package_json,
      repository_ctx.path("package.json"))
  if repository_ctx.attr.package_lock_json:
      repository_ctx.symlink(
          repository_ctx.attr.package_lock_json,
          repository_ctx.path("package-lock.json"))

  _add_data_dependencies(repository_ctx)

  # To see the output, pass: quiet=False
  result = repository_ctx.execute(
    [repository_ctx.path("npm.cmd" if is_windows else "npm")])

  if not repository_ctx.attr.package_lock_json:
    print("\n***********WARNING***********\n%s: npm_install will require a package_lock_json attribute in future versions\n*****************************" % repository_ctx.name)

  if result.return_code:
    fail("npm_install failed: %s (%s)" % (result.stdout, result.stderr))

  remove_npm_absolute_paths = Label("@build_bazel_rules_nodejs_npm_install_deps//:node_modules/removeNPMAbsolutePaths/bin/removeNPMAbsolutePaths")

  # removeNPMAbsolutePaths is run on node_modules after npm install as the package.json files
  # generated by npm are non-deterministic. They contain absolute install paths and other private
  # information fields starting with "_". removeNPMAbsolutePaths removes all fields starting with "_".
  result = repository_ctx.execute(
    [node, repository_ctx.path(remove_npm_absolute_paths), repository_ctx.path("")])

  if result.return_code:
    fail("remove_npm_absolute_paths failed: %s (%s)" % (result.stdout, result.stderr))

  _create_build_file(repository_ctx, node)

npm_install = repository_rule(
    attrs = {
        "package_json": attr.label(
            allow_files = True,
            mandatory = True,
            single_file = True,
        ),
        "package_lock_json": attr.label(
            allow_files = True,
            single_file = True,
        ),
        "data": attr.label_list(),
        "manual_build_file_contents": attr.string(
            doc = """Experimental attribute that can be used to override
            the generated BUILD.bazel file and set its contents manually.
            Can be used to work-around a bazel performance issue if the
            default node_modules filegroup has too many files in it. See 
            https://github.com/bazelbuild/bazel/issues/5153. If
            you are running into performance issues due to a large 
            node_modules filegroup it is recommended to switch to using
            fine grained npm dependencies."""),
    },
    implementation = _npm_install_impl,
)
"""Runs npm install during workspace setup.
"""

def _yarn_install_impl(repository_ctx):
  """Core implementation of yarn_install."""

  # Put our package descriptors in the right place.
  repository_ctx.symlink(
      repository_ctx.attr.package_json,
      repository_ctx.path("package.json"))
  if repository_ctx.attr.yarn_lock:
      repository_ctx.symlink(
          repository_ctx.attr.yarn_lock,
          repository_ctx.path("yarn.lock"))

  _add_data_dependencies(repository_ctx)

  node = repository_ctx.path(get_node_label(repository_ctx))
  yarn = get_yarn_label(repository_ctx)
  node_path = repository_ctx.path(get_node_label(repository_ctx))
  bash_exe = repository_ctx.os.environ.get("BAZEL_SH", "bash")

  # A local cache is used as multiple yarn rules cannot run simultaneously using a shared
  # cache and a shared cache is non-hermetic.
  # To see the output, pass: quiet=False
  if repository_ctx.attr.workspace_node_modules:
    package_dir = str(repository_ctx.path(repository_ctx.attr.package_json).dirname)
    # Note: if we wanted to hard-link in a portable manner we could use:
    # rsync --archive --link-dest {package_dir} {package_dir}/node_modules {repo_directory}
    args = [bash_exe, "-xc", """
      {yarn} --cache-folder {yarn_cache_directory} --cwd {package_dir}
      ln -sf {package_dir}/node_modules {repo_directory}/node_modules
      """.format(
        repo_directory=repository_ctx.path(""),
        yarn_cache_directory=package_dir + "/._yarn_cache",
        package_dir=package_dir,
        yarn=repository_ctx.path(yarn),
    )]
  else:
    args = [
      repository_ctx.path(yarn),
      "--cache-folder",
      repository_ctx.path("_yarn_cache"),
      "--cwd",
      repository_ctx.path(""),
    ]

  result = repository_ctx.execute(args, quiet=False)

  if result.return_code:
    fail("yarn_install failed: %s (%s)" % (result.stdout, result.stderr))

  _create_build_file(repository_ctx, node)

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
        "workspace_node_modules": attr.bool(
          doc = """When set to true yarn will run in the directory where the
          package.json is located and then just symlink the node_modules into
          the external repository. This has the benefit that the node_modules
          get permanently persisted and it integrates nicer when using the
          'yarn add/remove' commands.""",
          default = False,
        ),
        "data": attr.label_list(),
        "manual_build_file_contents": attr.string(
            doc = """Experimental attribute that can be used to override
            the generated BUILD.bazel file and set its contents manually.
            Can be used to work-around a bazel performance issue if the
            default node_modules filegroup has too many files in it. See 
            https://github.com/bazelbuild/bazel/issues/5153. If
            you are running into performance issues due to a large 
            node_modules filegroup it is recommended to switch to using
            fine grained npm dependencies."""),
    },
    implementation = _yarn_install_impl,
)
"""Runs yarn install during workspace setup.
"""
