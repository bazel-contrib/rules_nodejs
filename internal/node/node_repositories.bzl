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

"""Install NodeJS & Yarn

This is a set of repository rules for setting up hermetic copies of NodeJS and Yarn.
See https://docs.bazel.build/versions/master/skylark/repository_rules.html
"""

load(":node_labels.bzl", "get_yarn_label")
load("//internal/common:check_bazel_version.bzl", "check_bazel_version")
load("//internal/npm_install:npm_install.bzl", "yarn_install")

# Callers that don't specify a particular version will get these.
DEFAULT_NODE_VERSION = "8.9.1"
DEFAULT_YARN_VERSION = "1.3.2"

# Dictionary mapping NodeJS versions to sets of hosts and their correspoding (filename, strip_prefix, sha256) tuples.
NODE_REPOSITORIES = {
  # 9.11.1
  "9.11.1-darwin_amd64": ("node-v9.11.1-darwin-x64.tar.gz", "node-v9.11.1-darwin-x64", "7b1fb394aa41a62b477e36df16644bd383cc9084808511f6cd318b835a06aac6"),
  "9.11.1-linux_amd64": ("node-v9.11.1-linux-x64.tar.xz", "node-v9.11.1-linux-x64", "4d27a95d5c2f1c8ef99118794c9c4903e63963418d3e16ca7576760cff39879b"),
  "9.11.1-windows_amd64": ("node-v9.11.1-win-x64.zip", "node-v9.11.1-win-x64", "0a3566d57ccb7fed95d18fc6c3bc1552a1b1e4753f9bc6c5d45e04f325e1ee53"),
  # 8.11.1
  "8.11.1-darwin_amd64": ("node-v8.11.1-darwin-x64.tar.gz", "node-v8.11.1-darwin-x64", "5c7b05899ff56910a2b8180f139d48612f349ac2c5d20f08dbbeffbed9e3a089"),
  "8.11.1-linux_amd64": ("node-v8.11.1-linux-x64.tar.xz", "node-v8.11.1-linux-x64", "6617e245fa0f7fbe0e373e71d543fea878315324ab31dc64b4eba10e42d04c11"),
  "8.11.1-windows_amd64": ("node-v8.11.1-win-x64.zip", "node-v8.11.1-win-x64", "7d49b59c2b5d73a14c138e8a215d558a64a5241cd5035d9824f608e7bba097b1"),
  # 8.9.1
  "8.9.1-darwin_amd64": ("node-v8.9.1-darwin-x64.tar.gz", "node-v8.9.1-darwin-x64", "05c992a6621d28d564b92bf3051a5dc0adf83839237c0d4653a8cdb8a1c73b94"),
  "8.9.1-linux_amd64": ("node-v8.9.1-linux-x64.tar.xz", "node-v8.9.1-linux-x64", "8be82805f7c1ab3e64d4569fb9a90ded2de78dd27cadbb91bad1bf975dae1e2d"),
  "8.9.1-windows_amd64": ("node-v8.9.1-win-x64.zip", "node-v8.9.1-win-x64", "db89c6e041da359561fbe7da075bb4f9881a0f7d3e98c203e83732cfb283fa4a"),
}

# Dictionary mapping Yarn versions to their correspoding (filename, strip_prefix, sha256) tuples.
YARN_REPOSITORIES = {
  "1.6.0": ("yarn-v1.6.0.tar.gz", "yarn-v1.6.0", "a57b2fdb2bfeeb083d45a883bc29af94d5e83a21c25f3fc001c295938e988509"),
  "1.5.1": ("yarn-v1.5.1.tar.gz", "yarn-v1.5.1", "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1"),
  "1.3.2": ("yarn-v1.3.2.tar.gz", "yarn-v1.3.2", "6cfe82e530ef0837212f13e45c1565ba53f5199eec2527b85ecbcd88bf26821d"),
}

# Urls patterns for downloading node & yarn distributions
NODE_URLS = [
  "https://mirror.bazel.build/nodejs.org/dist/v{version}/{filename}",
  "https://nodejs.org/dist/v{version}/{filename}",
]
YARN_URLS = [
  "https://mirror.bazel.build/github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
  "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
]

# def _write_node_modules_impl(repository_ctx):
  # WORKAROUND for https://github.com/bazelbuild/bazel/issues/374#issuecomment-296217940
  # Bazel does not allow labels to start with `@`, so when installing eg. the `@types/node`
  # module from the @types scoped package, you'll get an error.
  # The workaround is to move the rule up one level, from /node_modules to the project root.
  # For now, users must instead write their own /BUILD file on setup.

  # repository_ctx.symlink(project_dir.get_child("node_modules"), "node_modules")
  # add a BUILD file inside the user's node_modules project folder
  # repository_ctx.file("installed/BUILD", """
  #   filegroup(name = "node_modules", srcs = glob(["node_modules/**/*"]), visibility = ["//visibility:public"])
  # """)

# _write_node_modules = repository_rule(
#     _write_node_modules_impl,
#     attrs = { "package_json": attr.label() },
# )

def _get_host(repository_ctx):
  os_name = repository_ctx.os.name.lower()
  if os_name.startswith("mac os"):
    return 'darwin_amd64'
  elif os_name.find("windows") != -1:
    return 'windows_amd64'
  elif os_name.startswith('linux'):
    return "linux_amd64"
  else:
    fail("Unsupported operating system: " + os_name)

def _download_node(repository_ctx):
  """Used to download a NodeJS runtime package.

  Args:
    repository_ctx: The repository rule context
  """
  if repository_ctx.attr.node_path != "":
    return

  host = _get_host(repository_ctx)
  node_version = repository_ctx.attr.node_version
  node_repositories = repository_ctx.attr.node_repositories
  node_urls = repository_ctx.attr.node_urls

  # Download node & npm
  node_host_version = "{}-{}".format(node_version, host)
  if node_host_version in node_repositories:
    filename, strip_prefix, sha256 = node_repositories[node_host_version]
  else:
    fail("Unknown NodeJS host/version {}".format(node_host_version))

  repository_ctx.download_and_extract(
    url = [url.format(version = node_version, filename = filename) for url in node_urls],
    output = "node",
    stripPrefix = strip_prefix,
    sha256 = sha256,
  )

def _download_yarn(repository_ctx):
  """Used to download a yarn tool package.

  Args:
    repository_ctx: The repository rule context
  """
  if repository_ctx.attr.yarn_path != "":
    return

  yarn_version = repository_ctx.attr.yarn_version
  yarn_repositories = repository_ctx.attr.yarn_repositories
  yarn_urls = repository_ctx.attr.yarn_urls

  if yarn_version in yarn_repositories:
    filename, strip_prefix, sha256 = yarn_repositories[yarn_version]
  else:
    fail("Unknown Yarn version {}".format(yarn_version))

  repository_ctx.download_and_extract(
    url = [url.format(version = yarn_version, filename = filename) for url in yarn_urls],
    output = "yarn",
    stripPrefix = strip_prefix,
    sha256 = sha256,
  )

def _prepare_node(repository_ctx):
  """Sets up BUILD files and shell wrappers for the versions of NodeJS, npm & yarn just set up.
  
  Windows and other OSes set up the node runtime with different names and paths, which we hide away via
  the BUILD file here.
  In addition, we create a bash script wrapper around NPM that passes a given NPM command to all package.json labels
  passed into here.
  Finally, we create a reusable template bash script around NPM that is used by rules like npm_package to access
  NPM.

  Args:
    repository_ctx: The repository rule context
  """
  is_windows = _get_host(repository_ctx).find("windows") != -1
  node_path = repository_ctx.path("node") if repository_ctx.attr.node_path == "" else repository_ctx.attr.node_path
  yarn_path = repository_ctx.path("yarn") if repository_ctx.attr.yarn_path == "" else repository_ctx.attr.yarn_path
  node_exec = "{}/bin/node".format(node_path) if not is_windows else  "{}/node.exe".format(node_path)
  npm_script = "{}/bin/npm".format(node_path) if not is_windows else "{}/node_modules/npm/bin/npm-cli.js".format(node_path)
  yarn_script = "{}/bin/yarn.js".format(yarn_path)
  node_entry = "repository_bin/node" if not is_windows else "repository_bin/node.cmd"
  npm_entry = "repository_bin/npm" if not is_windows else "repository_bin/npm.cmd"
  yarn_entry = "repository_bin/yarn" if not is_windows else "repository_bin/yarn.cmd"

  # Base build file for this repository - exposes the node runtime and utilities generated below.
  repository_ctx.file("BUILD.bazel", content="""#Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
exports_files([
  "run_npm.sh.template",
  "repository_bin/node",
  "repository_bin/node.cmd",
  "repository_bin/node_args.sh",
  "repository_bin/npm",
  "repository_bin/npm.cmd",
  "repository_bin/yarn",
  "repository_bin/yarn.cmd",
  ])
alias(name = "node", actual = "{node}")
alias(name = "npm", actual = "{npm}")
alias(name = "yarn", actual = "{yarn}")
""".format(
    node = node_entry,
    npm = npm_entry,
    yarn = yarn_entry))

  # The entry points for node for osx/linux and windows
  if not is_windows:
    # Sets process.env['PATH'] for node, npm & yarn and runs user script
    # This extra step is needed as process.env['PATH'] needs to be set
    # in some cases on osx/linux and in other cases PATH set in
    # repository_bin/node is sufficient.
    repository_ctx.file("repository_bin/node.js", content="""//Generated by node_repositories.bzl
const {{spawnSync}} = require('child_process');
process.env['PATH'] = `"{root}":${{process.env['PATH']}}`;
spawnSync("{node}", process.argv.slice(2), {{stdio: [process.stdin, process.stdout, process.stderr]}});
""".format(
    root = repository_ctx.path("repository_bin"),
    node = node_exec))

    # Sets PATH and runs repository_bin/node.js passing all arguments
    repository_ctx.file("repository_bin/node", content="""
export PATH="{root}":$PATH
"{node}" "{script}" "$@"
""".format(
    root = repository_ctx.path("repository_bin"),
    node = node_exec,
    script = repository_ctx.path("repository_bin/node.js")))
  else:
    # Sets PATH for node, npm & yarn and run user script
    repository_bin_windows = "{}".format(repository_ctx.path("repository_bin")).replace('/', '\\')
    repository_ctx.file("repository_bin/node.cmd", content="""
@echo off
SET PATH={root};%PATH%
call "{node}" %*
""".format(
    root = repository_bin_windows,
    node = node_exec))

  # Shell script to set repository arguments for node used by nodejs_binary & nodejs_test launcher
  repository_ctx.file("repository_bin/node_args.sh", content="""#!/bin/bash
#Generated by node_repositories.bzl
export NODE_REPOSITORY_ARGS={}
""".format("--node_options=--preserve-symlinks" if repository_ctx.attr.preserve_symlinks else ""), executable = True)

  # The entry points for npm for osx/linux and windows
  # Runs npm using appropriate node entry point
  # --scripts-prepend-node-path is set to false since the correct paths
  # for the Bazel entry points of node, npm & yarn are set in the node
  # entry point
  if not is_windows:
    repository_ctx.file("repository_bin/npm", content="""#!/bin/bash
#Generated by node_repositories.bzl
#Executes the given NPM command over each of the package.json folders provided in node_respositories.
""" + "".join(["""
(cd "{root}"; "{node}" "{script}" --scripts-prepend-node-path=false "$@")
""".format(
    root = repository_ctx.path(package_json).dirname,
    node = repository_ctx.path(node_entry),
    script = npm_script)
    for package_json in repository_ctx.attr.package_json]), executable = True)
  else:
    repository_ctx.file("repository_bin/npm.cmd", content="""@echo off
""" + "".join(["""
cd "{root}" && call "{node}" "{script}" --scripts-prepend-node-path=false %*
""".format(
    root = repository_ctx.path(package_json).dirname,
    node = repository_ctx.path(node_entry),
    script = npm_script)
    for package_json in repository_ctx.attr.package_json]), executable = True)

  # This template file is used by the packager tool and the npm_package rule.
  # `yarn publish` is not ready for use under Bazel, see https://github.com/yarnpkg/yarn/issues/610
  repository_ctx.file("run_npm.sh.template", content="""
"{node}" "{script}" TMPL_args "$@"
""".format(
    node = repository_ctx.path(node_entry),
    script = npm_script))

  # The entry points for yarn for osx/linux and windows
  # Runs yarn using appropriate node entry point
  if not is_windows:
    repository_ctx.file("repository_bin/yarn", content="""#!/bin/bash
#Generated by node_repositories.bzl
#Executes the given NPM command over each of the package.json folders provided in node_respositories.
""" + "".join(["""
"{node}" "{script}" --cwd "{root}" "$@"
""".format(
    node = repository_ctx.path(node_entry),
    script = yarn_script,
    root = repository_ctx.path(package_json).dirname)
    for package_json in repository_ctx.attr.package_json]), executable = True)
  else:
    repository_ctx.file("repository_bin/yarn.cmd", content="""@echo off
""" + "".join(["""
call "{node}" "{script}" --cwd "{root}" %*
""".format(
    node = repository_ctx.path(node_entry),
    script = yarn_script,
    root = repository_ctx.path(package_json).dirname)
    for package_json in repository_ctx.attr.package_json]), executable = True)

def _nodejs_repo_impl(repository_ctx):
  _download_node(repository_ctx)
  _download_yarn(repository_ctx)
  _prepare_node(repository_ctx)

_nodejs_repo = repository_rule(
  _nodejs_repo_impl,
  attrs = {
    "package_json": attr.label_list(),
    # Options to override node version
    "node_version": attr.string(default = DEFAULT_NODE_VERSION),
    "yarn_version": attr.string(default = DEFAULT_YARN_VERSION),
    "node_path": attr.string(),
    "yarn_path": attr.string(),
    "node_repositories": attr.string_list_dict(default = NODE_REPOSITORIES),
    "yarn_repositories": attr.string_list_dict(default = YARN_REPOSITORIES),
    "node_urls": attr.string_list(default = NODE_URLS),
    "yarn_urls": attr.string_list(default = YARN_URLS),
    # TODO: change preserve_symlinks default to true all issues with preserve-symlinks resolved
    "preserve_symlinks": attr.bool(default = False),
  },
)

def _yarn_repo_impl(repository_ctx):
  # Base build file for this repository - exposes yarn
  repository_ctx.file("BUILD.bazel", content="""#Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
alias(name = "yarn", actual = "{yarn}")
""".format(yarn = get_yarn_label(repository_ctx)))

_yarn_repo = repository_rule(
  _yarn_repo_impl,
  attrs = { "package_json": attr.label_list() }
)

# TODO: change preserve_symlinks default to true all issues with preserve-symlinks resolved
def node_repositories(
  package_json,
  node_version=DEFAULT_NODE_VERSION,
  yarn_version=DEFAULT_YARN_VERSION,
  node_path="",
  yarn_path="",
  node_repositories=NODE_REPOSITORIES,
  yarn_repositories=YARN_REPOSITORIES,
  node_urls=NODE_URLS,
  yarn_urls=YARN_URLS,
  preserve_symlinks=False):
  """To be run in user's WORKSPACE to install rules_nodejs dependencies.

  This rule sets up node, npm, and yarn.
  
  The versions of these tools can be specified in one of three ways:
  - Normal Usage:
    Specify no explicit versions. This will download and use the latest NodeJS & Yarn that were available when the
    version of rules_nodejs you're using was released.
  - Forced version(s):
    You can select the version of NodeJS and/or Yarn to download & use by specifying it when you call node_repositories,
    but you must use a value that matches a known version.
  - Using a custom version:
    You can pass in a custom list of NodeJS and/or Yarn repositories and URLs for node_resositories to use.
  - Using a local version:
    To avoid downloads, you can check in vendored copies of NodeJS and/or Yarn and set node_path and or yarn_path
    to point to those before calling node_repositories.

  This rule exposes the `@nodejs` workspace containing some rules the user can call later:

  - Run node: `bazel run @nodejs//:node path/to/program.js`
  - Install dependencies using npm: `bazel run @nodejs//:npm install`
  - Install dependencies using yarn: `bazel run @nodejs//:yarn`

  This rule also exposes the `@yarn` workspace for backwards compatabilty:

  - Alternately install dependencies using yarn: `bazel run @yarn//:yarn`

  Note that the dependency installation scripts will run in each subpackage indicated by the `package_json` attribute.

  This approach uses npm/yarn as the package manager. You could instead have Bazel act as the package manager, running the install behind the scenes.
  See the `npm_install` and `yarn_install` rules, and the discussion in the README.

  Example:

  ```
  load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")
  node_repositories(package_json = ["//:package.json", "//subpkg:package.json"])
  ```

  Running `bazel run @nodejs//:yarn` in this repo would create `/node_modules` and `/subpkg/node_modules`.

  Args:
    package_json: a list of labels, which indicate the package.json files that need to be installed.

    node_version: optional; the specific version of NodeJS to install.

    yarn_version: optional; the specific version of Yarn to install.

    node_path: optional; the local path to a pre-installed NodeJS runtime.

    yarn_path: optional; the local path to a pre-installed yarn tool.

    node_repositories: optional; custom list of node repositories to use.

    yarn_repositories: optional; custom list of yarn repositories to use.

    node_urls: optional; custom list of URLs to use to download NodeJS.

    yarn_urls: optional; custom list of URLs to use to download Yarn.

    preserve_symlinks: Turn on --node_options=--preserve-symlinks for nodejs_binary and nodejs_test rules.
      The default for this is currently False but will be switched to True in the future. When this option is
      turned on, node will preserve the symlinked path for resolves instead of the default behavior of resolving
      to the real path. This means that all required files must be in be included in your runfiles as it
      prevents the default behavior of potentially resolving outside of the runfiles. For example, all required
      files need to be included in your node_modules filegroup. This option is desirable as it gives a stronger
      guarantee of hermiticity which is required for remote execution.
  """
  # Windows users need sh_binary wrapped as an .exe
  check_bazel_version("0.5.4")

  _nodejs_repo(
    name = "nodejs",
    package_json = package_json,
    node_version = node_version,
    yarn_version = yarn_version,
    node_path = node_path,
    yarn_path = yarn_path,
    node_repositories = node_repositories,
    yarn_repositories = yarn_repositories,
    node_urls = node_urls,
    yarn_urls = yarn_urls,
    preserve_symlinks = preserve_symlinks,
  )

  _yarn_repo(
    name = "yarn",
    package_json = package_json,
  )

  yarn_install(
      name = "build_bazel_rules_nodejs_npm_install_deps",
      package_json = "@build_bazel_rules_nodejs//internal/npm_install:package.json",
      yarn_lock = "@build_bazel_rules_nodejs//internal/npm_install:yarn.lock",
  )

  yarn_install(
      name = "build_bazel_rules_nodejs_rollup_deps",
      package_json = "@build_bazel_rules_nodejs//internal/rollup:package.json",
      yarn_lock = "@build_bazel_rules_nodejs//internal/rollup:yarn.lock",
  )