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

load(":node_labels.bzl", "get_yarn_node_repositories_label")
load("//internal/common:check_bazel_version.bzl", "check_bazel_version")
load("//internal/common:os_name.bzl", "os_name")
load("//internal/npm_install:npm_install.bzl", "yarn_install")
load("@bazel_skylib//:lib.bzl", "paths")

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

NODE_DIR = "bin/nodejs"
YARN_DIR= "bin/yarnpkg"

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

def _download_node(repository_ctx):
  """Used to download a NodeJS runtime package.

  Args:
    repository_ctx: The repository rule context
  """
  if repository_ctx.attr.node_path != "":
    return

  host = os_name(repository_ctx)
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
    output = NODE_DIR,
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
    output = YARN_DIR,
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
  is_windows = os_name(repository_ctx).find("windows") != -1
  node_exec = "{}/bin/node".format(NODE_DIR) if not is_windows else "{}/node.exe".format(NODE_DIR)
  npm_script = "{}/bin/npm".format(NODE_DIR) if not is_windows else "{}/node_modules/npm/bin/npm-cli.js".format(NODE_DIR)
  yarn_script = "{}/bin/yarn.js".format(YARN_DIR)
  node_entry = "bin/node" if not is_windows else "bin/node.cmd"
  npm_node_repositories_entry = "bin/npm_node_repositories" if not is_windows else "bin/npm_node_repositories.cmd"
  yarn_node_repositories_entry = "bin/yarn_node_repositories" if not is_windows else "bin/yarn_node_repositories.cmd"

  # Base build file for this repository - exposes the node runtime and utilities generated below.
  repository_ctx.file("BUILD.bazel", content="""#Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
exports_files([
  "run_npm.sh.template",
  "{node_dir}/bin/node",
  "bin/node",
  "bin/node.js",
  "bin/node.cmd",
  "bin/node_args.sh",
  "bin/npm",
  "bin/npm.cmd",
  "bin/npm_node_repositories",
  "bin/npm_node_repositories.cmd",
  "bin/yarn",
  "bin/yarn.cmd",
  "bin/yarn_node_repositories",
  "bin/yarn_node_repositories.cmd",
  ])
alias(name = "node", actual = "{node}")
alias(name = "npm", actual = "{npm}")
alias(name = "yarn", actual = "{yarn}")
filegroup(
  name = "node_runfiles",
  srcs = glob(
    [
      "bin/node.js",
      "{node_dir}/**",
      "{yarn_dir}/**",
    ],
    exclude = [
      "**/*.md",
      "**/*.html",
    ],
  ),
)
""".format(
    node = node_entry,
    npm = npm_node_repositories_entry,
    yarn = yarn_node_repositories_entry,
    node_dir = NODE_DIR,
    yarn_dir = YARN_DIR))

  # The entry points for node for osx/linux and windows
  if not is_windows:
    # Sets process.env['PATH'] for node, npm & yarn and runs user script
    # This extra step is needed as process.env['PATH'] needs to be set
    # in some cases on osx/linux and in other cases PATH set in
    # bin/node is sufficient. The first argument is the PATH to prepend.
    repository_ctx.file("bin/node.js", content="""//Generated by node_repositories.bzl
const {spawn} = require('child_process');
process.env['PATH'] = `${process.argv[2]}:${process.env['PATH']}`;
const proc = spawn(process.argv0, process.argv.slice(3), {stdio: [process.stdin, process.stdout, process.stderr]});
proc.on('close', (code) => { process.exit(code); });
""")

    # Sets PATH and runs bin/node.js passing all arguments
    repository_ctx.file("bin/node", content="""#!/bin/bash
#Generated by node_repositories.bzl
CUR_DIR=$(realpath $(dirname ${{BASH_SOURCE[0]}}))
export PATH="$CUR_DIR":$PATH
"$CUR_DIR/{node}" "$CUR_DIR/{script}" "$CUR_DIR" "$@"
""".format(
    node = paths.relativize(node_exec, "bin"),
    script = "node.js"))
  else:
    # Sets PATH for node, npm & yarn and run user script
    repository_ctx.file("bin/node.cmd", content="""
@echo off
SET CUR_DIR=%~dp0
SET PATH=%CUR_DIR%;%PATH%
CALL "%CUR_DIR%\\{node}" %*
""".format(node = paths.relativize(node_exec, "bin")))

  # Shell script to set repository arguments for node used by nodejs_binary & nodejs_test launcher
  repository_ctx.file("bin/node_args.sh", content="""#!/bin/bash
#Generated by node_repositories.bzl
export NODE_REPOSITORY_ARGS={}
""".format("--node_options=--preserve-symlinks" if repository_ctx.attr.preserve_symlinks else ""), executable = True)

  # The entry points for npm for osx/linux and windows
  # Runs npm using appropriate node entry point
  # --scripts-prepend-node-path is set to false since the correct paths
  # for the Bazel entry points of node, npm & yarn are set in the node
  # entry point
  if not is_windows:
    # Npm entry point
    repository_ctx.file("bin/npm", content="""#!/bin/bash
#Generated by node_repositories.bzl
CUR_DIR=$(realpath $(dirname ${{BASH_SOURCE[0]}}))
"$CUR_DIR/{node}" "$CUR_DIR/{script}" --scripts-prepend-node-path=false "$@"
""".format(
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(npm_script, "bin")),
    executable = True)
    # Npm entry point for node_repositories
    repository_ctx.file("bin/npm_node_repositories", content="""#!/bin/bash
#Generated by node_repositories.bzl
#Executes the given npm command over each of the package.json folders provided in node_repositories.
set -e
CUR_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
""" + "".join(["""
echo Running npm "$@" in {root}
(cd "{root}"; "$CUR_DIR/{node}" "$CUR_DIR/{script}" --scripts-prepend-node-path=false "$@")
""".format(
    root = repository_ctx.path(package_json).dirname,
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(npm_script, "bin"))
    for package_json in repository_ctx.attr.package_json]), executable = True)
  else:
    # Npm entry point
    repository_ctx.file("bin/npm.cmd", content="""@echo off
SET CUR_DIR=%~dp0
"%CUR_DIR%\\{node}" "%CUR_DIR%\\{script}" --scripts-prepend-node-path=false %*
""".format(
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(npm_script, "bin")),
    executable = True)
    # Npm entry point for node_repositories
    repository_ctx.file("bin/npm_node_repositories.cmd", content="""@echo off
""" + "".join(["""
SET CUR_DIR=%~dp0
echo Running npm %* in {root}
cd "{root}"
call "%CUR_DIR%\\{node}" "%CUR_DIR%\\{script}" --scripts-prepend-node-path=false %*
if %errorlevel% neq 0 exit /b %errorlevel%
""".format(
    root = repository_ctx.path(package_json).dirname,
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(npm_script, "bin"))
    for package_json in repository_ctx.attr.package_json]), executable = True)

  # This template file is used by the packager tool and the npm_package rule.
  # `yarn publish` is not ready for use under Bazel, see https://github.com/yarnpkg/yarn/issues/610
  repository_ctx.file("run_npm.sh.template", content="""
"{node}" "{script}" TMPL_args "$@"
""".format(
    node = repository_ctx.path(node_entry),
    script = repository_ctx.path(npm_script)))

  # The entry points for yarn for osx/linux and windows
  # Runs yarn using appropriate node entry point
  if not is_windows:
    # Yarn entry point
    repository_ctx.file("bin/yarn", content="""#!/bin/bash
#Generated by node_repositories.bzl
CUR_DIR=$(realpath $(dirname ${{BASH_SOURCE[0]}}))
"$CUR_DIR/{node}" "$CUR_DIR/{script}" "$@"
""".format(
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(yarn_script, "bin")),
    executable = True)
    # Yarn entry point for node_repositories
    repository_ctx.file("bin/yarn_node_repositories", content="""#!/bin/bash
#Generated by node_repositories.bzl
#Executes the given yarn command over each of the package.json folders provided in node_repositories.
set -e
CUR_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
""" + "".join(["""
echo Running yarn --cwd "{root}" "$@"
"$CUR_DIR/{node}" "$CUR_DIR/{script}" --cwd "{root}" "$@"
""".format(
    root = repository_ctx.path(package_json).dirname,
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(yarn_script, "bin"))
    for package_json in repository_ctx.attr.package_json]), executable = True)
  else:
    # Yarn entry point
    repository_ctx.file("bin/yarn.cmd", content="""@echo off
SET CUR_DIR=%~dp0
"%CUR_DIR%\\{node}" "%CUR_DIR%\\{script}" %*
""".format(
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(yarn_script, "bin")),
    executable = True)
    # Yarn entry point for node_repositories
    repository_ctx.file("bin/yarn_node_repositories.cmd", content="""@echo off
SET CUR_DIR=%~dp0
""" + "".join(["""
echo Running yarn --cwd "{root}" %*
CALL "%CUR_DIR%\\{node}" "%CUR_DIR%\\{script}" --cwd "{root}" %*
if %errorlevel% neq 0 exit /b %errorlevel%
""".format(
    root = repository_ctx.path(package_json).dirname,
    node = paths.relativize(node_entry, "bin"),
    script = paths.relativize(yarn_script, "bin"))
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
""".format(yarn = get_yarn_node_repositories_label(repository_ctx)))

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
  # @bazel_tools//tools/bash/runfiles is required for nodejs
  check_bazel_version("0.14.0")

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
