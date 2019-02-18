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

load("//internal/common:check_bazel_version.bzl", "check_bazel_version")
load("//internal/common:os_name.bzl", "os_name")
load("//internal/npm_install:npm_install.bzl", "yarn_install")
load("//third_party/github.com/bazelbuild/bazel-skylib:lib/paths.bzl", "paths")
load(":node_labels.bzl", "get_yarn_node_repositories_label")

# Callers that don't specify a particular version will get these.
DEFAULT_NODE_VERSION = "10.13.0"
DEFAULT_YARN_VERSION = "1.12.3"

# Dictionary mapping NodeJS versions to sets of hosts and their correspoding (filename, strip_prefix, sha256) tuples.
NODE_REPOSITORIES = {
    # 10.10.0
    "10.10.0-darwin_amd64": ("node-v10.10.0-darwin-x64.tar.gz", "node-v10.10.0-darwin-x64", "00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e"),
    "10.10.0-linux_amd64": ("node-v10.10.0-linux-x64.tar.xz", "node-v10.10.0-linux-x64", "686d2c7b7698097e67bcd68edc3d6b5d28d81f62436c7cf9e7779d134ec262a9"),
    "10.10.0-windows_amd64": ("node-v10.10.0-win-x64.zip", "node-v10.10.0-win-x64", "70c46e6451798be9d052b700ce5dadccb75cf917f6bf0d6ed54344c856830cfb"),
    # 10.13.0
    "10.13.0-darwin_amd64": ("node-v10.13.0-darwin-x64.tar.gz", "node-v10.13.0-darwin-x64", "815a5d18516934a3963ace9f0574f7d41f0c0ce9186a19be3d89e039e57598c5"),
    "10.13.0-linux_amd64": ("node-v10.13.0-linux-x64.tar.xz", "node-v10.13.0-linux-x64", "0dc6dba645550b66f8f00541a428c29da7c3cde32fb7eda2eb626a9db3bbf08d"),
    "10.13.0-windows_amd64": ("node-v10.13.0-win-x64.zip", "node-v10.13.0-win-x64", "eb09c9e9677f1919ec1ca78623c09b2a718ec5388b72b7662d5c41e5f628a52c"),
    # 10.3.0
    "10.3.0-darwin_amd64": ("node-v10.3.0-darwin-x64.tar.gz", "node-v10.3.0-darwin-x64", "0bb5b7e3fe8cccda2abda958d1eb0408f1518a8b0cb58b75ade5d507cd5d6053"),
    "10.3.0-linux_amd64": ("node-v10.3.0-linux-x64.tar.xz", "node-v10.3.0-linux-x64", "eb3c3e2585494699716ad3197c8eedf4003d3f110829b30c5a0dc34414c47423"),
    "10.3.0-windows_amd64": ("node-v10.3.0-win-x64.zip", "node-v10.3.0-win-x64", "65d586afb087406a2800d8e51f664c88b26d510f077b85a3b177a1bb79f73677"),
    # 10.9.0
    "10.9.0-darwin_amd64": ("node-v10.9.0-darwin-x64.tar.gz", "node-v10.9.0-darwin-x64", "3c4fe75dacfcc495a432a7ba2dec9045cff359af2a5d7d0429c84a424ef686fc"),
    "10.9.0-linux_amd64": ("node-v10.9.0-linux-x64.tar.xz", "node-v10.9.0-linux-x64", "c5acb8b7055ee0b6ac653dc4e458c5db45348cecc564b388f4ed1def84a329ff"),
    "10.9.0-windows_amd64": ("node-v10.9.0-win-x64.zip", "node-v10.9.0-win-x64", "6a75cdbb69d62ed242d6cbf0238a470bcbf628567ee339d4d098a5efcda2401e"),
    # 8.11.1
    "8.11.1-darwin_amd64": ("node-v8.11.1-darwin-x64.tar.gz", "node-v8.11.1-darwin-x64", "5c7b05899ff56910a2b8180f139d48612f349ac2c5d20f08dbbeffbed9e3a089"),
    "8.11.1-linux_amd64": ("node-v8.11.1-linux-x64.tar.xz", "node-v8.11.1-linux-x64", "6617e245fa0f7fbe0e373e71d543fea878315324ab31dc64b4eba10e42d04c11"),
    "8.11.1-windows_amd64": ("node-v8.11.1-win-x64.zip", "node-v8.11.1-win-x64", "7d49b59c2b5d73a14c138e8a215d558a64a5241cd5035d9824f608e7bba097b1"),
    # 8.12.0
    "8.12.0-darwin_amd64": ("node-v8.12.0-darwin-x64.tar.gz", "node-v8.12.0-darwin-x64", "ca131b84dfcf2b6f653a6521d31f7a108ad7d83f4d7e781945b2eca8172064aa"),
    "8.12.0-linux_amd64": ("node-v8.12.0-linux-x64.tar.xz", "node-v8.12.0-linux-x64", "29a20479cd1e3a03396a4e74a1784ccdd1cf2f96928b56f6ffa4c8dae40c88f2"),
    "8.12.0-windows_amd64": ("node-v8.12.0-win-x64.zip", "node-v8.12.0-win-x64", "9b22c9b23148b61ea0052826b3ac0255b8a3a542c125272b8f014f15bf11b091"),
    # 8.9.1
    "8.9.1-darwin_amd64": ("node-v8.9.1-darwin-x64.tar.gz", "node-v8.9.1-darwin-x64", "05c992a6621d28d564b92bf3051a5dc0adf83839237c0d4653a8cdb8a1c73b94"),
    "8.9.1-linux_amd64": ("node-v8.9.1-linux-x64.tar.xz", "node-v8.9.1-linux-x64", "8be82805f7c1ab3e64d4569fb9a90ded2de78dd27cadbb91bad1bf975dae1e2d"),
    "8.9.1-windows_amd64": ("node-v8.9.1-win-x64.zip", "node-v8.9.1-win-x64", "db89c6e041da359561fbe7da075bb4f9881a0f7d3e98c203e83732cfb283fa4a"),
    # 9.11.1
    "9.11.1-darwin_amd64": ("node-v9.11.1-darwin-x64.tar.gz", "node-v9.11.1-darwin-x64", "7b1fb394aa41a62b477e36df16644bd383cc9084808511f6cd318b835a06aac6"),
    "9.11.1-linux_amd64": ("node-v9.11.1-linux-x64.tar.xz", "node-v9.11.1-linux-x64", "4d27a95d5c2f1c8ef99118794c9c4903e63963418d3e16ca7576760cff39879b"),
    "9.11.1-windows_amd64": ("node-v9.11.1-win-x64.zip", "node-v9.11.1-win-x64", "0a3566d57ccb7fed95d18fc6c3bc1552a1b1e4753f9bc6c5d45e04f325e1ee53"),
}

# Dictionary mapping Yarn versions to their correspoding (filename, strip_prefix, sha256) tuples.
YARN_REPOSITORIES = {
    "1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"),
    "1.12.3": ("yarn-v1.12.3.tar.gz", "yarn-v1.12.3", "02cd4b589ec22c4bdbd2bc5ebbfd99c5e99b07242ad68a539cb37896b93a24f2"),
    "1.3.2": ("yarn-v1.3.2.tar.gz", "yarn-v1.3.2", "6cfe82e530ef0837212f13e45c1565ba53f5199eec2527b85ecbcd88bf26821d"),
    "1.5.1": ("yarn-v1.5.1.tar.gz", "yarn-v1.5.1", "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1"),
    "1.6.0": ("yarn-v1.6.0.tar.gz", "yarn-v1.6.0", "a57b2fdb2bfeeb083d45a883bc29af94d5e83a21c25f3fc001c295938e988509"),
    "1.9.2": ("yarn-v1.9.2.tar.gz", "yarn-v1.9.2", "3ad69cc7f68159a562c676e21998eb21b44138cae7e8fe0749a7d620cf940204"),
    "1.9.4": ("yarn-v1.9.4.tar.gz", "yarn-v1.9.4", "7667eb715077b4bad8e2a832e7084e0e6f1ba54d7280dc573c8f7031a7fb093e"),
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
YARN_DIR = "bin/yarnpkg"

GET_SCRIPT_DIR = """
# From stackoverflow.com
SOURCE="${BASH_SOURCE[0]}"
# Resolve $SOURCE until the file is no longer a symlink
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE" )" >/dev/null && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  # if $SOURCE was a relative symlink, we need to resolve it relative to the
  # path where the symlink file was located.
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$( dirname "$SOURCE" )" >/dev/null && pwd)"
"""

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
    if repository_ctx.attr.vendored_node:
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
    if repository_ctx.attr.vendored_yarn:
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
    if repository_ctx.attr.vendored_node:
        node_exec = "/".join([f for f in [
            "../../..",
            repository_ctx.attr.vendored_node.workspace_root,
            repository_ctx.attr.vendored_node.package,
            repository_ctx.attr.vendored_node.name,
            "bin/node" if not is_windows else "node.exe",
        ] if f])
        npm_script = "/".join([f for f in [
            "../../..",
            repository_ctx.attr.vendored_node.workspace_root,
            repository_ctx.attr.vendored_node.package,
            repository_ctx.attr.vendored_node.name,
            "bin/npm" if not is_windows else "node_modules/npm/bin/npm-cli.js",
        ] if f])
    else:
        node_exec = "{}/bin/node".format(NODE_DIR) if not is_windows else "{}/node.exe".format(NODE_DIR)
        npm_script = "{}/bin/npm".format(NODE_DIR) if not is_windows else "{}/node_modules/npm/bin/npm-cli.js".format(NODE_DIR)
    if repository_ctx.attr.vendored_yarn:
        yarn_script = "/".join([f for f in [
            "../../..",
            repository_ctx.attr.vendored_yarn.workspace_root,
            repository_ctx.attr.vendored_yarn.package,
            repository_ctx.attr.vendored_yarn.name,
            "bin/yarn.js",
        ] if f])
    else:
        yarn_script = "{}/bin/yarn.js".format(YARN_DIR)
    node_entry = "bin/node" if not is_windows else "bin/node.cmd"
    npm_node_repositories_entry = "bin/npm_node_repositories" if not is_windows else "bin/npm_node_repositories.cmd"
    yarn_node_repositories_entry = "bin/yarn_node_repositories" if not is_windows else "bin/yarn_node_repositories.cmd"

    node_exec_relative = node_exec if repository_ctx.attr.vendored_node else paths.relativize(node_exec, "bin")
    npm_script_relative = npm_script if repository_ctx.attr.vendored_node else paths.relativize(npm_script, "bin")
    yarn_script_relative = yarn_script if repository_ctx.attr.vendored_yarn else paths.relativize(yarn_script, "bin")

    if not repository_ctx.attr.preserve_symlinks:
        print("\nWARNING: The preserve_symlinks option is deprecated and will go away in the future.\n")

    # The entry points for node for osx/linux and windows
    if not is_windows:
        # Sets PATH and runs the application
        repository_ctx.file("bin/node", content = """#!/usr/bin/env bash
# Generated by node_repositories.bzl
# Immediately exit if any command fails.
set -e
{get_script_dir}
export PATH="$SCRIPT_DIR":$PATH
exec "$SCRIPT_DIR/{node}" "$@"
""".format(
            get_script_dir = GET_SCRIPT_DIR,
            node = node_exec_relative,
        ))
    else:
        # Sets PATH for node, npm & yarn and run user script
        repository_ctx.file("bin/node.cmd", content = """
@echo off
SET SCRIPT_DIR=%~dp0
SET PATH=%SCRIPT_DIR%;%PATH%
CALL "%SCRIPT_DIR%\\{node}" %*
""".format(node = node_exec_relative))

    # Shell script to set repository arguments for node used by nodejs_binary & nodejs_test launcher
    repository_ctx.file("bin/node_args.sh", content = """#!/usr/bin/env bash
# Immediately exit if any command fails.
set -e
# Generated by node_repositories.bzl
export NODE_REPOSITORY_ARGS={}
""".format("--node_options=--preserve-symlinks" if repository_ctx.attr.preserve_symlinks else ""), executable = True)

    # The entry points for npm for osx/linux and windows
    # Runs npm using appropriate node entry point
    # --scripts-prepend-node-path is set to false since the correct paths
    # for the Bazel entry points of node, npm & yarn are set in the node
    # entry point
    if not is_windows:
        # Npm entry point
        repository_ctx.file(
            "bin/npm",
            content = """#!/usr/bin/env bash
# Generated by node_repositories.bzl
# Immediately exit if any command fails.
set -e
{get_script_dir}
"$SCRIPT_DIR/{node}" "$SCRIPT_DIR/{script}" --scripts-prepend-node-path=false "$@"
""".format(
                get_script_dir = GET_SCRIPT_DIR,
                node = paths.relativize(node_entry, "bin"),
                script = npm_script_relative,
            ),
            executable = True,
        )

        # Npm entry point for node_repositories
        repository_ctx.file("bin/npm_node_repositories", content = """#!/usr/bin/env bash
# Generated by node_repositories.bzl
# Immediately exit if any command fails.
set -e
# Executes the given npm command over each of the package.json folders provided in node_repositories.
""" + GET_SCRIPT_DIR + "".join([
            """
echo Running npm "$@" in {root}
(cd "{root}"; "$SCRIPT_DIR/{node}" "$SCRIPT_DIR/{script}" --scripts-prepend-node-path=false "$@")
""".format(
                root = repository_ctx.path(package_json).dirname,
                node = paths.relativize(node_entry, "bin"),
                script = npm_script_relative,
            )
            for package_json in repository_ctx.attr.package_json
        ]), executable = True)
    else:
        # Npm entry point
        repository_ctx.file(
            "bin/npm.cmd",
            content = """@echo off
SET SCRIPT_DIR=%~dp0
"%SCRIPT_DIR%\\{node}" "%SCRIPT_DIR%\\{script}" --scripts-prepend-node-path=false %*
""".format(
                node = paths.relativize(node_entry, "bin"),
                script = npm_script_relative,
            ),
            executable = True,
        )

        # Npm entry point for node_repositories
        repository_ctx.file("bin/npm_node_repositories.cmd", content = """@echo off
""" + "".join([
            """
SET SCRIPT_DIR=%~dp0
echo Running npm %* in {root}
cd "{root}"
call "%SCRIPT_DIR%\\{node}" "%SCRIPT_DIR%\\{script}" --scripts-prepend-node-path=false %*
if %errorlevel% neq 0 exit /b %errorlevel%
""".format(
                root = repository_ctx.path(package_json).dirname,
                node = paths.relativize(node_entry, "bin"),
                script = npm_script_relative,
            )
            for package_json in repository_ctx.attr.package_json
        ]), executable = True)

    # This template file is used by the packager tool and the npm_package rule.
    # `yarn publish` is not ready for use under Bazel, see https://github.com/yarnpkg/yarn/issues/610
    repository_ctx.file("run_npm.sh.template", content = """
"{node}" "{script}" TMPL_args "$@"
""".format(
        node = repository_ctx.path(node_entry),
        script = repository_ctx.path(npm_script),
    ))

    # The entry points for yarn for osx/linux and windows
    # Runs yarn using appropriate node entry point
    if not is_windows:
        # Yarn entry point
        repository_ctx.file(
            "bin/yarn",
            content = """#!/usr/bin/env bash
# Generated by node_repositories.bzl
# Immediately exit if any command fails.
set -e
{get_script_dir}
"$SCRIPT_DIR/{node}" "$SCRIPT_DIR/{script}" "$@"
""".format(
                get_script_dir = GET_SCRIPT_DIR,
                node = paths.relativize(node_entry, "bin"),
                script = yarn_script_relative,
            ),
            executable = True,
        )

        # Yarn entry point for node_repositories
        repository_ctx.file("bin/yarn_node_repositories", content = """#!/usr/bin/env bash
# Generated by node_repositories.bzl
# Immediately exit if any command fails.
set -e
# Executes the given yarn command over each of the package.json folders provided in node_repositories.
""" + GET_SCRIPT_DIR + "".join([
            """
echo Running yarn --cwd "{root}" "$@"
"$SCRIPT_DIR/{node}" "$SCRIPT_DIR/{script}" --cwd "{root}" "$@"
""".format(
                root = repository_ctx.path(package_json).dirname,
                node = paths.relativize(node_entry, "bin"),
                script = yarn_script_relative,
            )
            for package_json in repository_ctx.attr.package_json
        ]), executable = True)
    else:
        # Yarn entry point
        repository_ctx.file(
            "bin/yarn.cmd",
            content = """@echo off
SET SCRIPT_DIR=%~dp0
"%SCRIPT_DIR%\\{node}" "%SCRIPT_DIR%\\{script}" %*
""".format(
                node = paths.relativize(node_entry, "bin"),
                script = yarn_script_relative,
            ),
            executable = True,
        )

        # Yarn entry point for node_repositories
        repository_ctx.file("bin/yarn_node_repositories.cmd", content = """@echo off
SET SCRIPT_DIR=%~dp0
""" + "".join([
            """
echo Running yarn --cwd "{root}" %*
CALL "%SCRIPT_DIR%\\{node}" "%SCRIPT_DIR%\\{script}" --cwd "{root}" %*
if %errorlevel% neq 0 exit /b %errorlevel%
""".format(
                root = repository_ctx.path(package_json).dirname,
                node = paths.relativize(node_entry, "bin"),
                script = yarn_script_relative,
            )
            for package_json in repository_ctx.attr.package_json
        ]), executable = True)

    # Generate build file for this repository - exposes the node runtime and utilities generated above.
    repository_ctx.template(
        "generate_build_file.js",
        repository_ctx.path(Label("//internal/node:generate_build_file.js")),
        {
            "TEMPLATED_is_windows": "true" if is_windows else "false",
            "TEMPLATED_node_actual": node_entry,
            "TEMPLATED_node_dir": NODE_DIR,
            "TEMPLATED_npm_actual": npm_node_repositories_entry,
            "TEMPLATED_yarn_actual": yarn_node_repositories_entry,
            "TEMPLATED_yarn_dir": YARN_DIR,
        },
    )
    result = repository_ctx.execute([node_entry, "generate_build_file.js"])
    if result.return_code:
        fail("node failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

def _nodejs_repo_impl(repository_ctx):
    _download_node(repository_ctx)
    _download_yarn(repository_ctx)
    _prepare_node(repository_ctx)

_nodejs_repo = repository_rule(
    _nodejs_repo_impl,
    attrs = {
        "node_repositories": attr.string_list_dict(default = NODE_REPOSITORIES),
        "node_urls": attr.string_list(default = NODE_URLS),
        # Options to override node version
        "node_version": attr.string(default = DEFAULT_NODE_VERSION),
        "package_json": attr.label_list(),
        "preserve_symlinks": attr.bool(default = True),
        "vendored_node": attr.label(allow_single_file = True),
        "vendored_yarn": attr.label(allow_single_file = True),
        "yarn_repositories": attr.string_list_dict(default = YARN_REPOSITORIES),
        "yarn_urls": attr.string_list(default = YARN_URLS),
        "yarn_version": attr.string(default = DEFAULT_YARN_VERSION),
    },
)

def _yarn_repo_impl(repository_ctx):
    # Base build file for this repository - exposes yarn
    repository_ctx.file("BUILD.bazel", content = """# Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
alias(name = "yarn", actual = "{yarn}")
""".format(yarn = get_yarn_node_repositories_label(repository_ctx)))

_yarn_repo = repository_rule(
    _yarn_repo_impl,
    attrs = {"package_json": attr.label_list()},
)

def node_repositories(
        package_json = [],
        node_version = DEFAULT_NODE_VERSION,
        yarn_version = DEFAULT_YARN_VERSION,
        vendored_node = None,
        vendored_yarn = None,
        node_repositories = NODE_REPOSITORIES,
        yarn_repositories = YARN_REPOSITORIES,
        node_urls = NODE_URLS,
        yarn_urls = YARN_URLS,
        preserve_symlinks = True):
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
      To avoid downloads, you can check in vendored copies of NodeJS and/or Yarn and set vendored_node and or vendored_yarn
      to point to those before calling node_repositories.

    This rule exposes the `@nodejs` workspace containing some rules the user can call later:

    - Run node: `bazel run @nodejs//:node path/to/program.js`
    - Install dependencies using npm: `bazel run @nodejs//:npm install`
    - Install dependencies using yarn: `bazel run @nodejs//:yarn`

    This rule also exposes the `@yarn` workspace for backwards compatibility:

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
      package_json: a list of labels, which indicate the package.json files that will be installed
                    when you manually run the package manager, e.g. with
                    `bazel run @nodejs//:yarn` or `bazel run @nodejs//:npm install`.
                    If you use bazel-managed dependencies, you can omit this attribute.

      node_version: optional; the specific version of NodeJS to install.

      yarn_version: optional; the specific version of Yarn to install.

      vendored_node: optional; the local path to a pre-installed NodeJS runtime.

      vendored_yarn: optional; the local path to a pre-installed yarn tool.

      node_repositories: optional; custom list of node repositories to use.

      yarn_repositories: optional; custom list of yarn repositories to use.

      node_urls: optional; custom list of URLs to use to download NodeJS.

      yarn_urls: optional; custom list of URLs to use to download Yarn.

      preserve_symlinks: Turn on --node_options=--preserve-symlinks for nodejs_binary and nodejs_test rules.
        The default for this is currently True but the options is deprecated and will be removed in the future.
        When this option is turned on, node will preserve the symlinked path for resolves instead of the default
        behavior of resolving to the real path. This means that all required files must be in be included in your
        runfiles as it prevents the default behavior of potentially resolving outside of the runfiles. For example,
        all required files need to be included in your node_modules filegroup. This option is desirable as it gives
        a stronger guarantee of hermiticity which is required for remote execution.
    """

    # 0.14.0: @bazel_tools//tools/bash/runfiles is required for nodejs
    # 0.17.1: allow @ in package names is required for fine grained deps
    # 0.21.0: repository_ctx.report_progress API
    check_bazel_version("0.21.0")

    _maybe(
        _nodejs_repo,
        name = "nodejs",
        package_json = package_json,
        node_version = node_version,
        yarn_version = yarn_version,
        vendored_node = vendored_node,
        vendored_yarn = vendored_yarn,
        node_repositories = node_repositories,
        yarn_repositories = yarn_repositories,
        node_urls = node_urls,
        yarn_urls = yarn_urls,
        preserve_symlinks = preserve_symlinks,
    )

    _maybe(
        _yarn_repo,
        name = "yarn",
        package_json = package_json,
    )

    _maybe(
        yarn_install,
        name = "build_bazel_rules_nodejs_npm_install_deps",
        package_json = "@build_bazel_rules_nodejs//internal/npm_install:package.json",
        yarn_lock = "@build_bazel_rules_nodejs//internal/npm_install:yarn.lock",
        # Just here as a smoke test for this attribute
        prod_only = True,
    )

    _maybe(
        yarn_install,
        name = "build_bazel_rules_nodejs_rollup_deps",
        package_json = "@build_bazel_rules_nodejs//internal/rollup:package.json",
        yarn_lock = "@build_bazel_rules_nodejs//internal/rollup:yarn.lock",
    )

    _maybe(
        yarn_install,
        name = "history-server_runtime_deps",
        package_json = "@build_bazel_rules_nodejs//internal/history-server:package.json",
        yarn_lock = "@build_bazel_rules_nodejs//internal/history-server:yarn.lock",
    )

    _maybe(
        yarn_install,
        name = "http-server_runtime_deps",
        package_json = "@build_bazel_rules_nodejs//internal/http-server:package.json",
        yarn_lock = "@build_bazel_rules_nodejs//internal/http-server:yarn.lock",
    )

    _maybe(
        yarn_install,
        name = "build_bazel_rules_nodejs_web_package_deps",
        package_json = "@build_bazel_rules_nodejs//internal/web_package:package.json",
        yarn_lock = "@build_bazel_rules_nodejs//internal/web_package:yarn.lock",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
