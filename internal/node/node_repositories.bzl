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
load("//internal/common:os_name.bzl", "OS_ARCH_NAMES", "os_name")
load("//internal/node:node_versions.bzl", "NODE_VERSIONS")
load("//third_party/github.com/bazelbuild/bazel-skylib:lib/paths.bzl", "paths")
load("//toolchains/node:node_toolchain_configure.bzl", "node_toolchain_configure")

# @unsorted-dict-items
_YARN_VERSIONS = {
    "1.3.2": ("yarn-v1.3.2.tar.gz", "yarn-v1.3.2", "6cfe82e530ef0837212f13e45c1565ba53f5199eec2527b85ecbcd88bf26821d"),
    "1.5.1": ("yarn-v1.5.1.tar.gz", "yarn-v1.5.1", "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1"),
    "1.6.0": ("yarn-v1.6.0.tar.gz", "yarn-v1.6.0", "a57b2fdb2bfeeb083d45a883bc29af94d5e83a21c25f3fc001c295938e988509"),
    "1.9.2": ("yarn-v1.9.2.tar.gz", "yarn-v1.9.2", "3ad69cc7f68159a562c676e21998eb21b44138cae7e8fe0749a7d620cf940204"),
    "1.9.4": ("yarn-v1.9.4.tar.gz", "yarn-v1.9.4", "7667eb715077b4bad8e2a832e7084e0e6f1ba54d7280dc573c8f7031a7fb093e"),
    "1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"),
    "1.12.3": ("yarn-v1.12.3.tar.gz", "yarn-v1.12.3", "02cd4b589ec22c4bdbd2bc5ebbfd99c5e99b07242ad68a539cb37896b93a24f2"),
    "1.13.0": ("yarn-v1.13.0.tar.gz", "yarn-v1.13.0", "125d40ebf621ebb08e3f66a618bd2cc5cd77fa317a312900a1ab4360ed38bf14"),
    "1.19.1": ("yarn-v1.19.1.tar.gz", "yarn-v1.19.1", "34293da6266f2aae9690d59c2d764056053ff7eebc56b80b8df05010c3da9343"),
    "1.22.4": ("yarn-v1.22.4.tar.gz", "yarn-v1.22.4", "bc5316aa110b2f564a71a3d6e235be55b98714660870c5b6b2d2d3f12587fb58"),
    "1.22.10": ("yarn-v1.22.10.tar.gz", "yarn-v1.22.10", "7e433d4a77e2c79e6a7ae4866782608a8e8bcad3ec6783580577c59538381a6e"),
    # When adding a new version. please update /docs/install.md
}

_DOC = """To be run in user's WORKSPACE to install rules_nodejs dependencies.

This rule sets up node, npm, and yarn. The versions of these tools can be specified in one of three ways

### Simplest Usage

Specify no explicit versions. This will download and use the latest NodeJS & Yarn that were available when the
version of rules_nodejs you're using was released.
Note that you can skip calling `node_repositories` in your WORKSPACE file - if you later try to `yarn_install` or `npm_install`,
we'll automatically select this simple usage for you.

### Forced version(s)

You can select the version of NodeJS and/or Yarn to download & use by specifying it when you call node_repositories,
using a value that matches a known version (see the default values)

### Using a custom version

You can pass in a custom list of NodeJS and/or Yarn repositories and URLs for node_resositories to use.

#### Custom NodeJS versions

To specify custom NodeJS versions, use the `node_repositories` attribute

```python
node_repositories(
    node_repositories = {
        "10.10.0-darwin_amd64": ("node-v10.10.0-darwin-x64.tar.gz", "node-v10.10.0-darwin-x64", "00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e"),
        "10.10.0-linux_amd64": ("node-v10.10.0-linux-x64.tar.xz", "node-v10.10.0-linux-x64", "686d2c7b7698097e67bcd68edc3d6b5d28d81f62436c7cf9e7779d134ec262a9"),
        "10.10.0-windows_amd64": ("node-v10.10.0-win-x64.zip", "node-v10.10.0-win-x64", "70c46e6451798be9d052b700ce5dadccb75cf917f6bf0d6ed54344c856830cfb"),
    },
)
```

These can be mapped to a custom download URL, using `node_urls`

```python
node_repositories(
    node_version = "10.10.0",
    node_repositories = {"10.10.0-darwin_amd64": ("node-v10.10.0-darwin-x64.tar.gz", "node-v10.10.0-darwin-x64", "00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e")},
    node_urls = ["https://mycorpproxy/mirror/node/v{version}/{filename}"],
)
```

A Mac client will try to download node from `https://mycorpproxy/mirror/node/v10.10.0/node-v10.10.0-darwin-x64.tar.gz`
and expect that file to have sha256sum `00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e`

#### Custom Yarn versions

To specify custom Yarn versions, use the `yarn_repositories` attribute

```python
node_repositories(
    yarn_repositories = {
        "1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"),
    },
)
```

Like `node_urls`, the `yarn_urls` attribute can be used to provide a list of custom URLs to use to download yarn

```python
node_repositories(
    yarn_repositories = {
        "1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"),
    },
    yarn_version = "1.12.1",
    yarn_urls = [
        "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
    ],
)
```

Will download yarn from https://github.com/yarnpkg/yarn/releases/download/v1.2.1/yarn-v1.12.1.tar.gz
and expect the file to have sha256sum `09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d`.

If you don't use Yarn at all, you can skip downloading it by setting `yarn_urls = []`.

### Using a local version

To avoid downloads, you can check in vendored copies of NodeJS and/or Yarn and set vendored_node and or vendored_yarn
to point to those before calling node_repositories. You can also point to a location where node is installed on your computer,
but we don't recommend this because it leads to version skew between you, your coworkers, and your Continuous Integration environment.
It also ties your build to a single platform, preventing you from cross-compiling into a Linux docker image on Mac for example.

See the [the repositories documentation](repositories.html) for how to use the resulting repositories.

### Manual install

You can optionally pass a `package_json` array to node_repositories. This lets you use Bazel's version of yarn or npm, yet always run the package manager yourself.
This is an advanced scenario you can use in place of the `npm_install` or `yarn_install` rules, but we don't recommend it, and might remove it in the future.

```
load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")
node_repositories(package_json = ["//:package.json", "//subpkg:package.json"])
```

Running `bazel run @nodejs//:yarn_node_repositories` in this repo would create `/node_modules` and `/subpkg/node_modules`.

Note that the dependency installation scripts will run in each subpackage indicated by the `package_json` attribute.
"""

# TODO(kgreenek): Add arm64 versions for all of these.
_ATTRS = {
    "node_download_auth": attr.string_dict(
        default = {},
        doc = """auth to use for all url requests
Example: {\"type\": \"basic\", \"login\": \"<UserName>\", \"password\": \"<Password>\" }
""",
    ),
    "node_repositories": attr.string_list_dict(
        doc = """Custom list of node repositories to use

A dictionary mapping NodeJS versions to sets of hosts and their corresponding (filename, strip_prefix, sha256) tuples.
You should list a node binary for every platform users have, likely Mac, Windows, and Linux.

By default, if this attribute has no items, we'll use a list of all public NodeJS releases.
""",
    ),
    "node_urls": attr.string_list(
        default = [
            "https://nodejs.org/dist/v{version}/{filename}",
        ],
        doc = """custom list of URLs to use to download NodeJS

Each entry is a template for downloading a node distribution.

The `{version}` parameter is substituted with the `node_version` attribute,
and `{filename}` with the matching entry from the `node_repositories` attribute.
""",
    ),
    "node_version": attr.string(
        default = "12.13.0",
        doc = "the specific version of NodeJS to install or, if vendored_node is specified, the vendored version of node",
    ),
    "package_json": attr.label_list(
        doc = """(ADVANCED, not recommended)
            a list of labels, which indicate the package.json files that will be installed
            when you manually run the package manager, e.g. with
            `bazel run @nodejs//:yarn_node_repositories` or `bazel run @nodejs//:npm_node_repositories install`.
            If you use bazel-managed dependencies, you should omit this attribute.""",
    ),
    "preserve_symlinks": attr.bool(
        default = True,
        doc = """Turn on --node_options=--preserve-symlinks for nodejs_binary and nodejs_test rules.

When this option is turned on, node will preserve the symlinked path for resolves instead of the default
behavior of resolving to the real path. This means that all required files must be in be included in your
runfiles as it prevents the default behavior of potentially resolving outside of the runfiles. For example,
all required files need to be included in your node_modules filegroup. This option is desirable as it gives
a stronger guarantee of hermeticity which is required for remote execution.""",
    ),
    "vendored_node": attr.label(
        allow_single_file = True,
        doc = """the local path to a pre-installed NodeJS runtime.

If set then also set node_version to the version that of node that is vendored.""",
    ),
    "vendored_yarn": attr.label(
        allow_single_file = True,
        doc = "the local path to a pre-installed yarn tool",
    ),
    "yarn_download_auth": attr.string_dict(
        default = {},
        doc = """auth to use for all url requests
Example: {\"type\": \"basic\", \"login\": \"<UserName>\", \"password\": \"<Password>\" }
""",
    ),
    "yarn_repositories": attr.string_list_dict(
        doc = """Custom list of yarn repositories to use.

Dictionary mapping Yarn versions to their corresponding (filename, strip_prefix, sha256) tuples.

By default, if this attribute has no items, we'll use a list of all public NodeJS releases.
""",
    ),
    "yarn_urls": attr.string_list(
        default = [
            "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
        ],
        doc = """custom list of URLs to use to download Yarn

Each entry is a template, similar to the `node_urls` attribute, using `yarn_version` and `yarn_repositories` in the substitutions.

If this list is empty, we won't download yarn at all.
""",
    ),
    "yarn_version": attr.string(
        doc = "the specific version of Yarn to install",
        default = "1.19.1",
    ),
}

BUILT_IN_NODE_PLATFORMS = [
    "darwin_amd64",
    "linux_amd64",
    "linux_arm64",
    "windows_amd64",
    "linux_s390x",
]

NODE_EXTRACT_DIR = "bin/nodejs"
YARN_EXTRACT_DIR = "bin/yarnpkg"

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

def _download_node(repository_ctx):
    """Used to download a NodeJS runtime package.

    Args:
      repository_ctx: The repository rule context
    """
    if repository_ctx.attr.vendored_node:
        repository_ctx.file("node_info", content = "# vendored_node: {vendored_node}".format(
            vendored_node = repository_ctx.attr.vendored_node,
        ))
        return

    # The host is baked into the repository name by design.
    # Current these workspaces are:
    # @nodejs_PLATFORM where PLATFORM is one of BUILT_IN_NODE_PLATFORMS
    host_os = repository_ctx.name.split("nodejs_", 1)[1]

    node_version = repository_ctx.attr.node_version
    node_repositories = repository_ctx.attr.node_repositories

    # We insert our default value here, not on the attribute's default, so it isn't documented.
    # The size of NODE_VERSIONS constant is huge and not useful to document.
    if not node_repositories.items():
        node_repositories = NODE_VERSIONS
    node_urls = repository_ctx.attr.node_urls

    # Download node & npm
    version_host_os = "%s-%s" % (node_version, host_os)
    if not version_host_os in node_repositories:
        fail("Unknown NodeJS version-host %s" % version_host_os)
    filename, strip_prefix, sha256 = node_repositories[version_host_os]

    urls = [url.format(version = node_version, filename = filename) for url in node_urls]
    auth = {}
    for url in urls:
        auth[url] = repository_ctx.attr.node_download_auth

    repository_ctx.download_and_extract(
        auth = auth,
        url = urls,
        output = NODE_EXTRACT_DIR,
        stripPrefix = strip_prefix,
        sha256 = sha256,
    )

    repository_ctx.file("node_info", content = """# filename: {filename}
# strip_prefix: {strip_prefix}
# sha256: {sha256}
""".format(
        filename = filename,
        strip_prefix = strip_prefix,
        sha256 = sha256,
    ))

def _download_yarn(repository_ctx):
    """Used to download a yarn tool package.

    Args:
      repository_ctx: The repository rule context
    """
    yarn_urls = repository_ctx.attr.yarn_urls

    # If there are no URLs to download yarn, skip the download
    if not len(yarn_urls):
        repository_ctx.file("yarn_info", content = "# no yarn urls")
        return

    # If yarn is vendored locally, we still need the info file but can skip downloading
    if repository_ctx.attr.vendored_yarn:
        repository_ctx.file("yarn_info", content = "# vendored_yarn: {vendored_yarn}".format(
            vendored_yarn = repository_ctx.attr.vendored_yarn,
        ))
        return

    yarn_version = repository_ctx.attr.yarn_version
    yarn_repositories = repository_ctx.attr.yarn_repositories

    # We insert our default value here, not on the attribute's default, so it isn't documented.
    # The size of _YARN_VERSIONS constant is huge and not useful to document.
    if not yarn_repositories.items():
        yarn_repositories = _YARN_VERSIONS

    if yarn_version in yarn_repositories:
        filename, strip_prefix, sha256 = yarn_repositories[yarn_version]
    else:
        fail("Unknown Yarn version %s" % yarn_version)

    urls = [url.format(version = yarn_version, filename = filename) for url in yarn_urls]

    auth = {}
    for url in urls:
        auth[url] = repository_ctx.attr.yarn_download_auth

    repository_ctx.download_and_extract(
        auth = auth,
        url = urls,
        output = YARN_EXTRACT_DIR,
        stripPrefix = strip_prefix,
        sha256 = sha256,
    )

    repository_ctx.file("yarn_info", content = """# filename: {filename}
# strip_prefix: {strip_prefix}
# sha256: {sha256}
""".format(
        filename = filename,
        strip_prefix = strip_prefix,
        sha256 = sha256,
    ))

def _prepare_node(repository_ctx):
    """Sets up BUILD files and shell wrappers for the versions of NodeJS, npm & yarn just set up.

    Windows and other OSes set up the node runtime with different names and paths, which we hide away via
    the BUILD file here.
    In addition, we create a bash script wrapper around NPM that passes a given NPM command to all package.json labels
    passed into here.
    Finally, we create a reusable template bash script around NPM that is used by rules like pkg_npm to access
    NPM.

    Args:
      repository_ctx: The repository rule context
    """

    # TODO: Maybe we want to encode the OS as a specific attribute rather than do it based on naming?
    is_windows = "_windows_" in repository_ctx.attr.name

    if repository_ctx.attr.vendored_node:
        node_path = "/".join([f for f in [
            "../../..",
            repository_ctx.attr.vendored_node.workspace_root,
            repository_ctx.attr.vendored_node.package,
            repository_ctx.attr.vendored_node.name,
        ] if f])
        node_package = "@%s//%s:%s" % (
            repository_ctx.attr.vendored_node.workspace_name,
            repository_ctx.attr.vendored_node.package,
            repository_ctx.attr.vendored_node.name,
        )
    else:
        node_path = NODE_EXTRACT_DIR
        node_package = NODE_EXTRACT_DIR

    if repository_ctx.attr.vendored_yarn:
        yarn_path = "/".join([f for f in [
            "../../..",
            repository_ctx.attr.vendored_yarn.workspace_root,
            repository_ctx.attr.vendored_yarn.package,
            repository_ctx.attr.vendored_yarn.name,
        ] if f])
        yarn_package = "@%s//%s:%s" % (
            repository_ctx.attr.vendored_yarn.workspace_name,
            repository_ctx.attr.vendored_yarn.package,
            repository_ctx.attr.vendored_yarn.name,
        )
    else:
        yarn_path = YARN_EXTRACT_DIR
        yarn_package = YARN_EXTRACT_DIR

    node_bin = ("%s/bin/node" % node_path) if not is_windows else ("%s/node.exe" % node_path)
    node_bin_label = ("%s/bin/node" % node_package) if not is_windows else ("%s/node.exe" % node_package)

    # Use the npm-cli.js script as the bin for oxs & linux so there are no symlink issues with `%s/bin/npm`
    npm_bin = ("%s/lib/node_modules/npm/bin/npm-cli.js" % node_path) if not is_windows else ("%s/npm.cmd" % node_path)
    npm_bin_label = ("%s/lib/node_modules/npm/bin/npm-cli.js" % node_package) if not is_windows else ("%s/npm.cmd" % node_package)
    npm_script = ("%s/lib/node_modules/npm/bin/npm-cli.js" % node_path) if not is_windows else ("%s/node_modules/npm/bin/npm-cli.js" % node_path)

    # Use the npx-cli.js script as the bin for oxs & linux so there are no symlink issues with `%s/bin/npx`
    npx_bin = ("%s/lib/node_modules/npm/bin/npx-cli.js" % node_path) if not is_windows else ("%s/npx.cmd" % node_path)
    npx_bin_label = ("%s/lib/node_modules/npm/bin/npx-cli.js" % node_package) if not is_windows else ("%s/npx.cmd" % node_package)

    # Use the yarn.js script as the bin for oxs & linux so there are no symlink issues with `%s/bin/npm`
    yarn_bin = ("%s/bin/yarn.js" % yarn_path) if not is_windows else ("%s/yarn.cmd" % yarn_path)
    yarn_bin_label = ("%s/bin/yarn.js" % yarn_package) if not is_windows else ("%s/yarn.cmd" % yarn_package)
    yarn_script = "%s/bin/yarn.js" % yarn_path

    # Ensure that the "vendored" binaries are resolved
    # Just requesting their path from the repository context is enough to eager-load them
    if repository_ctx.attr.vendored_node:
        repository_ctx.path(Label(node_bin_label))
    if repository_ctx.attr.vendored_yarn:
        repository_ctx.path(Label(yarn_bin_label))

    entry_ext = ".cmd" if is_windows else ""
    node_entry = "bin/node%s" % entry_ext
    npm_entry = "bin/npm%s" % entry_ext
    yarn_entry = "bin/yarn%s" % entry_ext
    npm_node_repositories_entry = "bin/npm_node_repositories%s" % entry_ext
    yarn_node_repositories_entry = "bin/yarn_node_repositories%s" % entry_ext

    node_bin_relative = node_bin if repository_ctx.attr.vendored_node else paths.relativize(node_bin, "bin")
    npm_script_relative = npm_script if repository_ctx.attr.vendored_node else paths.relativize(npm_script, "bin")
    yarn_script_relative = yarn_script if repository_ctx.attr.vendored_yarn else paths.relativize(yarn_script, "bin")

    if repository_ctx.attr.preserve_symlinks:
        node_args = "--preserve-symlinks"
    else:
        node_args = ""

    # The entry points for node for osx/linux and windows
    if not is_windows:
        # Sets PATH and runs the application
        repository_ctx.file("bin/node", content = """#!/usr/bin/env bash
# Generated by node_repositories.bzl
# Immediately exit if any command fails.
set -e
{get_script_dir}
export PATH="$SCRIPT_DIR":$PATH
exec "$SCRIPT_DIR/{node}" {args} "$@"
""".format(
            get_script_dir = GET_SCRIPT_DIR,
            node = node_bin_relative,
            args = node_args,
        ))
    else:
        # Sets PATH for node, npm & yarn and run user script
        repository_ctx.file("bin/node.cmd", content = """
@echo off
SET SCRIPT_DIR=%~dp0
SET PATH=%SCRIPT_DIR%;%PATH%
CALL "%SCRIPT_DIR%\\{node}" {args} %*
""".format(node = node_bin_relative, args = node_args))

    # Shell script to set repository arguments for node used by nodejs_binary & nodejs_test launcher
    repository_ctx.file("bin/node_repo_args.sh", content = """#!/usr/bin/env bash
# Immediately exit if any command fails.
set -e
# Generated by node_repositories.bzl
export NODE_REPOSITORY_ARGS="{args}"
""".format(args = node_args), executable = True)

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
SET SCRIPT_DIR=%~dp0
""" + "".join([
            """
echo Running npm %* in {root}
cd /D "{root}"
CALL "%SCRIPT_DIR%\\{node}" "%SCRIPT_DIR%\\{script}" --scripts-prepend-node-path=false %*
if %errorlevel% neq 0 exit /b %errorlevel%
""".format(
                root = repository_ctx.path(package_json).dirname,
                node = paths.relativize(node_entry, "bin"),
                script = npm_script_relative,
            )
            for package_json in repository_ctx.attr.package_json
        ]), executable = True)

    # This template file is used by the packager tool and the pkg_npm rule.
    # `yarn publish` is not ready for use under Bazel, see https://github.com/yarnpkg/yarn/issues/610
    repository_ctx.file("run_npm.sh.template", content = """
"{node}" "{script}" TMPL_args "$@"
""".format(
        node = repository_ctx.path(node_entry),
        script = repository_ctx.path(npm_script),
    ))

    repository_ctx.file("run_npm.bat.template", content = """
"{node}" "{script}" TMPL_args %*
""".format(
        node = repository_ctx.path(node_entry),
        script = repository_ctx.path(npm_script),
    ))

    # The entry points for yarn for osx/linux and windows.
    # Runs yarn using appropriate node entry point.
    # Unset YARN_IGNORE_PATH before calling yarn incase it is set so that
    # .yarnrc yarn-path is followed if set. This is for the case when calling
    # bazel from yarn with `yarn bazel ...` and yarn follows yarn-path in
    # .yarnrc it will set YARN_IGNORE_PATH=1 which will prevent the bazel
    # call into yarn from also following the yarn-path as desired.
    if not is_windows:
        # Yarn entry point
        repository_ctx.file(
            "bin/yarn",
            content = """#!/usr/bin/env bash
# Generated by node_repositories.bzl
# Immediately exit if any command fails.
set -e
unset YARN_IGNORE_PATH
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
echo Running yarn "$@" in {root}
unset YARN_IGNORE_PATH
(cd "{root}"; "$SCRIPT_DIR/{node}" "$SCRIPT_DIR/{script}" "$@")
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
SET "YARN_IGNORE_PATH="
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
echo Running yarn %* in {root}
SET "YARN_IGNORE_PATH="
cd /D "{root}"
CALL "%SCRIPT_DIR%\\{node}" "%SCRIPT_DIR%\\{script}" %*
if %errorlevel% neq 0 exit /b %errorlevel%
""".format(
                root = repository_ctx.path(package_json).dirname,
                node = paths.relativize(node_entry, "bin"),
                script = yarn_script_relative,
            )
            for package_json in repository_ctx.attr.package_json
        ]), executable = True)

    # Base BUILD file for this repository
    repository_ctx.file("BUILD.bazel", content = """# Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
exports_files([
  "run_npm.sh.template",
  "run_npm.bat.template",
  "bin/node_repo_args.sh",{node_bin_export}{npm_bin_export}{npx_bin_export}{yarn_bin_export}
  "{node_entry}",
  "{npm_entry}",
  "{yarn_entry}",
  "{npm_node_repositories_entry}",
  "{yarn_node_repositories_entry}",
  ])
alias(name = "node_bin", actual = "{node_bin_label}")
alias(name = "npm_bin", actual = "{npm_bin_label}")
alias(name = "npx_bin", actual = "{npx_bin_label}")
alias(name = "yarn_bin", actual = "{yarn_bin_label}")
alias(name = "node", actual = "{node_entry}")
alias(name = "npm", actual = "{npm_entry}")
alias(name = "yarn", actual = "{yarn_entry}")
alias(name = "npm_node_repositories", actual = "{npm_node_repositories_entry}")
alias(name = "yarn_node_repositories", actual = "{yarn_node_repositories_entry}")
filegroup(
  name = "node_files",
  srcs = [":node", ":node_bin"],
)
filegroup(
  name = "yarn_files",
  srcs = {yarn_files_glob}[":node_files"],
)
filegroup(
  name = "npm_files",
  srcs = {npm_files_glob}[":node_files"],
)
""".format(
        node_bin_export = "" if repository_ctx.attr.vendored_node else ("\n  \"%s\"," % node_bin),
        npm_bin_export = "" if repository_ctx.attr.vendored_node else ("\n  \"%s\"," % npm_bin),
        npx_bin_export = "" if repository_ctx.attr.vendored_node else ("\n  \"%s\"," % npx_bin),
        npm_files_glob = "" if repository_ctx.attr.vendored_node else "glob([\"bin/nodejs/**\"]) + ",
        yarn_bin_export = "" if repository_ctx.attr.vendored_yarn else ("\n  \"%s\"," % yarn_bin),
        yarn_files_glob = "" if repository_ctx.attr.vendored_yarn else "glob([\"bin/yarnpkg/**\"]) + ",
        node_bin_label = node_bin_label,
        npm_bin_label = npm_bin_label,
        npx_bin_label = npx_bin_label,
        yarn_bin_label = yarn_bin_label,
        node_entry = node_entry,
        npm_entry = npm_entry,
        yarn_entry = yarn_entry,
        npm_node_repositories_entry = npm_node_repositories_entry,
        yarn_node_repositories_entry = yarn_node_repositories_entry,
    ))

def _nodejs_repo_impl(repository_ctx):
    _download_node(repository_ctx)
    _download_yarn(repository_ctx)
    _prepare_node(repository_ctx)

# Users should call the `node_repositories` wrapper macro.
# This is exposed for stardoc.
node_repositories_rule = repository_rule(
    _nodejs_repo_impl,
    doc = _DOC,
    attrs = _ATTRS,
)

def _nodejs_host_os_alias_impl(repository_ctx):
    # Base BUILD file for this repository
    repository_ctx.file("BUILD.bazel", content = """# Generated by node_repositories.bzl
package(default_visibility = ["//visibility:public"])
# aliases for exports_files
alias(name = "run_npm.sh.template", actual = "{node_repository}//:run_npm.sh.template")
alias(name = "run_npm.bat.template", actual = "{node_repository}//:run_npm.bat.template")
alias(name = "bin/node_repo_args.sh", actual = "{node_repository}//:bin/node_repo_args.sh")
# aliases for other aliases
alias(name = "node_bin", actual = "{node_repository}//:node_bin")
alias(name = "npm_bin", actual = "{node_repository}//:npm_bin")
alias(name = "npx_bin", actual = "{node_repository}//:npx_bin")
alias(name = "yarn_bin", actual = "{node_repository}//:yarn_bin")
alias(name = "node", actual = "{node_repository}//:node")
alias(name = "npm", actual = "{node_repository}//:npm")
alias(name = "yarn", actual = "{node_repository}//:yarn")
alias(name = "npm_node_repositories", actual = "{node_repository}//:npm_node_repositories")
alias(name = "yarn_node_repositories", actual = "{node_repository}//:yarn_node_repositories")
alias(name = "node_files", actual = "{node_repository}//:node_files")
alias(name = "yarn_files", actual = "{node_repository}//:yarn_files")
alias(name = "npm_files", actual = "{node_repository}//:npm_files")
exports_files(["index.bzl"])
""".format(node_repository = "@nodejs_%s" % os_name(repository_ctx)))

    # index.bzl file for this repository
    repository_ctx.file("index.bzl", content = """# Generated by node_repositories.bzl
host_platform="{host_platform}"
""".format(host_platform = os_name(repository_ctx)))

_nodejs_repo_host_os_alias = repository_rule(_nodejs_host_os_alias_impl)

def node_repositories(**kwargs):
    """
    Wrapper macro around node_repositories_rule to call it for each platform.

    Also register bazel toolchains, and make other convenience repositories.

    Note, the documentation is generated from the node_repositories_rule, not this macro.
    """

    # 0.14.0: @bazel_tools//tools/bash/runfiles is required for nodejs
    # 0.17.1: allow @ in package names is required for fine grained deps
    # 0.21.0: repository_ctx.report_progress API
    # 2.1.0: bazelignore support in external workspaces
    check_bazel_version(
        message = """
    A minimum Bazel version of 2.1.0 is required to use build_bazel_rules_nodejs.
    """,
        minimum_bazel_version = "2.1.0",
    )

    # This needs to be setup so toolchains can access nodejs for all different versions
    for os_arch_name in OS_ARCH_NAMES:
        os_name = "_".join(os_arch_name)
        node_repository_name = "nodejs_%s" % os_name
        _maybe(
            node_repositories_rule,
            name = node_repository_name,
            **kwargs
        )
        native.register_toolchains("@build_bazel_rules_nodejs//toolchains/node:node_%s_toolchain" % os_name)
        node_toolchain_configure(
            name = "%s_config" % node_repository_name,
            target_tool = "@%s//:node_bin" % node_repository_name,
        )

    # This "nodejs" repo is just for convinience so one does not have to target @nodejs_<os_name>//...
    # All it does is create aliases to the @nodejs_<host_os>_<host_arch> repository
    _maybe(
        _nodejs_repo_host_os_alias,
        name = "nodejs",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
