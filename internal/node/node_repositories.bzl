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

load(":node_labels.bzl", "get_node_label")
load("//internal/common:check_bazel_version.bzl", "check_bazel_version")
load("//internal/npm_install:npm_install.bzl", "yarn_install")

# Callers that don't specify a particular version will get these.
DEFAULT_NODE_VERSION = "8.9.1"
DEFAULT_YARN_VERSION = "1.3.2"

# Dictionary mapping NodeJS versions to sets of hosts and their correspoding (filename, strip_prefix, sha256) tuples.
NODE_REPOSITORIES = {
    "9.11.1": {
        "darwin_amd64":      ("node-v9.11.1-darwin-x64.tar.gz", "node-v9.11.1-darwin-x64", "7b1fb394aa41a62b477e36df16644bd383cc9084808511f6cd318b835a06aac6"),
        "linux_amd64":       ("node-v9.11.1-linux-x64.tar.xz", "node-v9.11.1-linux-x64", "4d27a95d5c2f1c8ef99118794c9c4903e63963418d3e16ca7576760cff39879b"),
        "windows_amd64":     ("node-v9.11.1-win-x64.zip", "node-v9.11.1-win-x64", "0a3566d57ccb7fed95d18fc6c3bc1552a1b1e4753f9bc6c5d45e04f325e1ee53"),
    },
    "8.11.1": {
        "darwin_amd64":      ("node-v8.11.1-darwin-x64.tar.gz", "node-v8.11.1-darwin-x64", "5c7b05899ff56910a2b8180f139d48612f349ac2c5d20f08dbbeffbed9e3a089"),
        "linux_amd64":       ("node-v8.11.1-linux-x64.tar.xz", "node-v8.11.1-linux-x64", "6617e245fa0f7fbe0e373e71d543fea878315324ab31dc64b4eba10e42d04c11"),
        "windows_amd64":     ("node-v8.11.1-win-x64.zip", "node-v8.11.1-win-x64", "7d49b59c2b5d73a14c138e8a215d558a64a5241cd5035d9824f608e7bba097b1"),
    },
    "8.9.1": {
        "darwin_amd64":      ("node-v8.9.1-darwin-x64.tar.gz", "node-v8.9.1-darwin-x64", "05c992a6621d28d564b92bf3051a5dc0adf83839237c0d4653a8cdb8a1c73b94"),
        "linux_amd64":       ("node-v8.9.1-linux-x64.tar.xz", "node-v8.9.1-linux-x64", "8be82805f7c1ab3e64d4569fb9a90ded2de78dd27cadbb91bad1bf975dae1e2d"),
        "windows_amd64":     ("node-v8.9.1-win-x64.zip", "node-v8.9.1-win-x64", "db89c6e041da359561fbe7da075bb4f9881a0f7d3e98c203e83732cfb283fa4a"),
    },
}

# Dictionary mapping Yarn versions to their correspoding (filename, strip_prefix, sha256) tuples.
YARN_REPOSITORIES = {
  "1.6.0": ("yarn-v1.6.0.tar.gz", "yarn-v1.6.0", "a57b2fdb2bfeeb083d45a883bc29af94d5e83a21c25f3fc001c295938e988509"),
  "1.5.1": ("yarn-v1.5.1.tar.gz", "yarn-v1.5.1", "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1"),
  "1.3.2": ("yarn-v1.3.2.tar.gz", "yarn-v1.3.2", "6cfe82e530ef0837212f13e45c1565ba53f5199eec2527b85ecbcd88bf26821d"),
}

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

def _prepare_node(repository_ctx):
  """Sets up BUILD files and shell wrappers for the version of NodeJS just set up.
  
  Windows and other OSes set up the node runtime with different names and paths, which we hide away via
  the BUILD file here.
  In addition, we create a bash script wrapper around NPM that passes a given NPM command to all package.json labels
  passed into here.
  Finally, we create a reusable template bash script around NPM that is used by rules like npm_package to access
  NPM.

  Args:
    repository_ctx: The repository rule context
  """
  host = _get_host(repository_ctx)

  if host.find("windows") != -1:
    # The windows distribution of nodejs has the binaries in different paths
    node = "node.exe"
    npm = "node_modules/npm/bin/npm-cli.js"
  else:
    node = "bin/node"
    npm = "bin/npm"

  # Base build file for this repository - exposes the node runtime and utilities generated below.
  repository_ctx.file("BUILD.bazel", content="""#Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
exports_files(["{0}", "run_npm.sh.template"])
alias(name = "node", actual = "{0}")
sh_binary(
  name = "npm",
  srcs = ["npm.sh"],
)
""".format(node))

  # This template file is used by the packager tool and the npm_package rule.
  # `yarn publish` is not ready for use under Bazel, see https://github.com/yarnpkg/yarn/issues/610
  repository_ctx.file("run_npm.sh.template", content="""
NODE="{}"
NPM="{}"
"$NODE" "$NPM" TMPL_args "$@"
""".format(repository_ctx.path(node), repository_ctx.path(npm)))

  repository_ctx.file("npm.sh", content="""#!/bin/bash
#Generated by node_repositories.bzl
#Executes the given NPM command over each of the package.json folders provided in node_respositories.
""" + "".join(["""
ROOT="{}"
NODE="{}"
SCRIPT="{}"
(cd "$ROOT"; "$NODE" "$SCRIPT" --scripts-prepend-node-path=true "$@")
""".format(
    repository_ctx.path(package_json).dirname,
    repository_ctx.path(node),
    repository_ctx.path(npm))
    for package_json in repository_ctx.attr.package_json]), executable = True)

def _node_download_runtime_impl(repository_ctx):
  """Used to download and register a NodeJS runtime repository.

  Repository Rule Args:
    name: A unique name for this runtime. This should almost always be nodejs if you want the runtime to be used by
    this rule set.

    version: The version of the NodeJS runtime to download.

    urls: A list of mirror urls to the binary distribution of a NodeJS runtime. These must contain the {}s used to
    substitute the version and runtime download filename being fetched (using .format).
    It defaults to the official repository "https://nodejs.org/dist/v{}/{}".

    packages: This consists of a set of mappings from the host platform to a list of filename, strip_prefix, and sha256
    for that file. The version & filename is combined with the mirror urls to produce the final download
    urls to use.

    package_json: a list of labels, which indicate the package.json files that the npm label will point to.

  Args:
    repository_ctx: The repository rule context
  """
  version = repository_ctx.attr.version
  packages = repository_ctx.attr.packages
  urls = repository_ctx.attr.urls

  host = _get_host(repository_ctx)
  if host not in packages:
    fail("Unsupported host {}".format(host))

  filename, strip_prefix, sha256 = packages[host]

  repository_ctx.download_and_extract(
    url = [url.format(version, filename) for url in urls],
    stripPrefix = strip_prefix,
    sha256 = sha256,
  )

  _prepare_node(repository_ctx)

node_download_runtime = repository_rule(
  _node_download_runtime_impl,
  attrs = {
    "version": attr.string(),
    "packages": attr.string_list_dict(),
    "urls": attr.string_list(default = ["https://nodejs.org/dist/v{}/{}"]),
    "package_json": attr.label_list(),
  },
)

def _node_local_runtime_impl(repository_ctx):
  """Used to register a vendored NodeJS runtime repository, usually one checked into the repo.

  Repository Rule Args:
    name - A unique name for this runtime. This should almost always be nodejs if you want the runtime to be used by
    this rule set.

    path - The local path to a pre-installed NodeJS runtime.

    package_json: a list of labels, which indicate the package.json files that the npm label will point to.

  Args:
    repository_ctx: The repository rule context
  """
  path = repository_ctx.attr.path
  for entry in ["bin", "include", "lib", "share"]:
    repository_ctx.symlink(path + "/" + entry, entry)
  _prepare_node(repository_ctx)

node_local_runtime = repository_rule(
  _node_local_runtime_impl,
  attrs = {
    "path": attr.string(),
    "package_json": attr.label_list(),
  },
)

def _prepare_yarn(repository_ctx):
  """Sets up BUILD files and shell wrappers for the version of Yarn just set up.
  
  The BUILD file exports our shell wrapper around Yarn.
  We wrap yarn in a small JS script that allows us to override PATHs as needed on Windows.
  We wrap that JS script in a bash script that allows us to override PATHs on Mac/Linux.

  Args:
    repository_ctx: The repository rule context
  """
  node = get_node_label(repository_ctx)

  repository_ctx.file("BUILD.bazel", content="""#Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
sh_binary(
  name = "yarn",
  srcs = ["yarn.sh"],
)
""")

  # Using process.env['PATH'] here to add node to the environment PATH on Windows
  # before running bin/yarn.js. export PATH="$NODE_PATH":$PATH in yarn.sh below
  # has no any effect on Windows and setting process.env['PATH'] has no effect
  # on OSX
  # TODO: revisit setting node environment PATH when bash dependency is eliminated
  repository_ctx.file("yarn.js", content="""//Generated by node_repositories.bzl
const {{spawnSync}} = require('child_process');
const node = "{}";
const nodePath = "{}";
const yarn = "{}";
process.env['PATH'] = `"${{nodePath}}":${{process.env['PATH']}}`;
spawnSync(node, [yarn, ...process.argv.slice(2)], {{stdio: ['ignore', process.stdout, process.stderr]}});
""".format(
    repository_ctx.path(node),
    repository_ctx.path(node).dirname,
    repository_ctx.path("bin/yarn.js")))

  repository_ctx.file("yarn.sh", content="""#!/bin/bash
#Generated by node_repositories.bzl
""" + "".join(["""
NODE="{}"
NODE_PATH="{}"
SCRIPT="{}"
ROOT="{}"
export PATH="$NODE_PATH":$PATH
"$NODE" "$SCRIPT" --cwd "$ROOT" "$@"
""".format(
    repository_ctx.path(node),
    repository_ctx.path(node).dirname,
    repository_ctx.path("yarn.js"),
    repository_ctx.path(package_json).dirname)
    for package_json in repository_ctx.attr.package_json]), executable = True)

def _yarn_download_impl(repository_ctx):
  """Used to download and register a Yarn tool repository.

  Repository Rule Args:
    name: A unique name for this tool repo. This should almost always be yarn if you want the tool to be used by
    this rule set.

    version: The version of Yarn to download.

    urls: A list of mirror urls to the binary distribution of a Yarn release. These must contain the {}s used to
    substitute the version and download filename being fetched (using .format).
    It defaults to the official repository "https://nodejs.org/dist/v{}/{}".

    packages: This consists of a set of mappings from the host platform to a list of filename, strip_prefix, and sha256
    for that file. The version & filename is combined with the mirror urls to produce the final download
    urls to use.

    package_json: a list of labels, which indicate the package.json files that the npm label will point to.
  
  Args:
    repository_ctx: The repository rule context
  """
  version = repository_ctx.attr.version
  filename = repository_ctx.attr.filename
  strip_prefix = repository_ctx.attr.strip_prefix
  sha256 = repository_ctx.attr.sha256
  urls = repository_ctx.attr.urls

  repository_ctx.download_and_extract(
    url = [url.format(version, filename) for url in urls],
    stripPrefix = strip_prefix,
    sha256 = sha256,
  )

  _prepare_yarn(repository_ctx)

yarn_download = repository_rule(
  _yarn_download_impl,
  attrs = {
    "version": attr.string(),
    "filename": attr.string(),
    "strip_prefix": attr.string(),
    "sha256": attr.string(),
    "urls": attr.string_list(default = ["https://github.com/yarnpkg/yarn/releases/download/v{}/{}"]),
    "package_json": attr.label_list(),
  },
)

def _yarn_local_impl(repository_ctx):
  """Used to register a vendored NodeJS runtime repository, usually one checked into the repo.

  Repository Rule Args:
    name - A unique name for this tool repo. This should almost always be yarn if you want the tool to be used by
    this rule set.

    path - The local path to a pre-installed yarn tool.

    package_json: a list of labels, which indicate the package.json files that the yarn label will point to.

  Args:
    repository_ctx: The repository rule context
  """
  repository_ctx.symlink(repository_ctx.attr.path + "/yarn" , "bin/yarn")
  _prepare_yarn(repository_ctx)

yarn_local = repository_rule(
  _yarn_local_impl,
  attrs = {
    "path": attr.string(),
    "package_json": attr.label_list(),
  },
)

def node_repositories(package_json, node_version=DEFAULT_NODE_VERSION, yarn_version=DEFAULT_YARN_VERSION):
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
    You can call node_download_runtime to setup a particular NodeJS version and yarn_download to setup a particular
    Yarn version before calling node_repositories.
  - Using a local version:
    To avoid downloads, you can check in vendored copies of NodeJS and/or Yarn and use rules node_local_runtime and
    yarn_local to point to those before calling node_repositories.

  This rule exposes workspaces `@nodejs` and `@yarn` containing some rules the user can call later:

  - Run node: `bazel run @nodejs//:node path/to/program.js`
  - Install dependencies using npm: `bazel run @nodejs//:npm install`
  - Install dependencies using yarn: `bazel run @yarn//:yarn`

  Note that the dependency installation scripts will run in each subpackage indicated by the `package_json` attribute.

  This approach uses npm/yarn as the package manager. You could instead have Bazel act as the package manager, running the install behind the scenes.
  See the `npm_install` and `yarn_install` rules, and the discussion in the README.

  Example:

  ```
  load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")
  node_repositories(package_json = ["//:package.json", "//subpkg:package.json"])
  ```

  Running `bazel run @yarn//:yarn` in this repo would create `/node_modules` and `/subpkg/node_modules`.

  Args:
    package_json: a list of labels, which indicate the package.json files that need to be installed.
    node_version: optional; the specific version of NodeJS to install.
    yarn_version: optional; the specific version of Yarn to install.
  """
  # Windows users need sh_binary wrapped as an .exe
  check_bazel_version("0.5.4")

  # If the caller already executed node_download_runtime or node_local_runtime, and correctly used the "nodejs"
  # repo name, then we can skip this step.
  if "nodejs" not in native.existing_rules():
    if node_version in NODE_REPOSITORIES:
      node_download_runtime(
          name = "nodejs",
          version = node_version,
          packages = NODE_REPOSITORIES[node_version],
          package_json = package_json,
      )
    else:
      fail("Unknown NodeJS version {}".format(node_version))

  # If the caller already executed yarn_download or yarn_local, and correctly used the "yarn" repo name, then we can
  # skip this step.
  if "yarn" not in native.existing_rules():
    if yarn_version in YARN_REPOSITORIES:
      filename, strip_prefix, sha256 = YARN_REPOSITORIES[yarn_version]
      yarn_download(
        name = "yarn",
        version = yarn_version,
        filename = filename,
        strip_prefix = strip_prefix,
        sha256 = sha256,
        package_json = package_json,
      )
    else:
      fail("Unknown Yarn version {}".format(yarn_version))

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