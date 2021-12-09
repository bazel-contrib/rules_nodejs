"Rules to be called from the users WORKSPACE"

load("//nodejs/private:os_name.bzl", "assert_node_exists_for_host", "node_exists_for_os")
load("//nodejs/private:node_versions.bzl", "NODE_VERSIONS")
load("//nodejs/private:nodejs_repo_host_os_alias.bzl", "nodejs_repo_host_os_alias")
load("//nodejs/private:toolchains_repo.bzl", "PLATFORMS", "toolchains_repo")
load("//nodejs/private:yarn_versions.bzl", "YARN_VERSIONS")
load("//third_party/github.com/bazelbuild/bazel-skylib:lib/paths.bzl", "paths")
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:utils.bzl", "maybe")

DEFAULT_NODE_VERSION = "16.12.0"

BUILT_IN_NODE_PLATFORMS = PLATFORMS.keys()

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
        default = DEFAULT_NODE_VERSION,
        doc = "the specific version of NodeJS to install or, if vendored_node is specified, the vendored version of node",
    ),
    "use_nvmrc": attr.label(
        allow_single_file = True,
        default = None,
        doc = """the local path of the .nvmrc file containing the version of node

If set then also set node_version to the version found in the .nvmrc file.""",
    ),
    "package_json": attr.label_list(
        doc = """(ADVANCED, not recommended)
            a list of labels, which indicate the package.json files that will be installed
            when you manually run the package manager, e.g. with
            `bazel run @nodejs//:yarn_node_repositories` or `bazel run @nodejs//:npm_node_repositories install`.
            If you use bazel-managed dependencies, you should omit this attribute.""",
    ),
    "platform": attr.string(
        doc = "Internal use only. Which platform to install as a toolchain. If unset, we assume the repository is named nodejs_[platform]",
        values = BUILT_IN_NODE_PLATFORMS,
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
        default = "1.22.11",
    ),
}

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

    # If platform is unset, we assume the repository follows the naming convention
    # @nodejs_PLATFORM where PLATFORM is one of BUILT_IN_NODE_PLATFORMS
    host_os = repository_ctx.attr.platform or repository_ctx.name.split("nodejs_", 1)[1]

    node_version = repository_ctx.attr.node_version

    if repository_ctx.attr.use_nvmrc:
        node_version = str(repository_ctx.read(repository_ctx.attr.use_nvmrc)).strip()

    _verify_version_is_valid(node_version)

    # Skip the download if we know it will fail
    if not node_exists_for_os(node_version, host_os):
        return
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
    # The size of YARN_VERSIONS constant is huge and not useful to document.
    if not yarn_repositories.items():
        yarn_repositories = YARN_VERSIONS

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

    # Use the npm-cli.js script as the bin for osx & linux so there are no symlink issues with `%s/bin/npm`
    npm_bin = ("%s/lib/node_modules/npm/bin/npm-cli.js" % node_path) if not is_windows else ("%s/npm.cmd" % node_path)
    npm_bin_label = ("%s/lib/node_modules/npm/bin/npm-cli.js" % node_package) if not is_windows else ("%s/npm.cmd" % node_package)
    npm_script = ("%s/lib/node_modules/npm/bin/npm-cli.js" % node_path) if not is_windows else ("%s/node_modules/npm/bin/npm-cli.js" % node_path)

    # Use the npx-cli.js script as the bin for osx & linux so there are no symlink issues with `%s/bin/npx`
    npx_bin = ("%s/lib/node_modules/npm/bin/npx-cli.js" % node_path) if not is_windows else ("%s/npx.cmd" % node_path)
    npx_bin_label = ("%s/lib/node_modules/npm/bin/npx-cli.js" % node_package) if not is_windows else ("%s/npx.cmd" % node_package)

    # Use the yarn.js script as the bin for osx & linux so there are no symlink issues with `%s/bin/npm`
    yarn_bin = ("%s/bin/yarn.js" % yarn_path) if not is_windows else ("%s/bin/yarn.cmd" % yarn_path)
    yarn_bin_label = ("%s/bin/yarn.js" % yarn_package) if not is_windows else ("%s/bin/yarn.cmd" % yarn_package)
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
    build_content = """# Generated by node_repositories.bzl
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
    )

    # the platform attribute is only set when used from this file, not from build_bazel_rules_nodejs
    if repository_ctx.attr.platform:
        build_content += """
load("@rules_nodejs//nodejs:toolchain.bzl", "node_toolchain")
node_toolchain(name = "node_toolchain", target_tool = ":node_bin")
"""
    repository_ctx.file("BUILD.bazel", content = build_content)

def _verify_version_is_valid(version):
    major, minor, patch = (version.split(".") + [None, None, None])[:3]
    if not major.isdigit() or not minor.isdigit() or not patch.isdigit():
        fail("Invalid node version: %s" % version)

def _nodejs_repo_impl(repository_ctx):
    assert_node_exists_for_host(repository_ctx)
    _download_node(repository_ctx)
    _download_yarn(repository_ctx)
    _prepare_node(repository_ctx)

node_repositories = repository_rule(
    _nodejs_repo_impl,
    doc = _DOC,
    attrs = _ATTRS,
)

# Wrapper macro around everything above, this is the primary API
def nodejs_register_toolchains(name, **kwargs):
    """Convenience macro for users which does typical setup.

    - create a repository for each built-in platform like "node16_linux_amd64" -
      this repository is lazily fetched when node is needed for that platform.
    - create a convenience repository for the host platform like "node16_host"
    - create a repository exposing toolchains for each platform like "node16_platforms"
    - register a toolchain pointing at each platform

    Users can avoid this macro and do these steps themselves, if they want more control.

    Args:
        name: base name for all created repos, like "node16"
        **kwargs: passed to each node_repositories call
    """
    for platform in BUILT_IN_NODE_PLATFORMS:
        node_repositories(
            name = name + "_" + platform,
            platform = platform,
            **kwargs
        )
        native.register_toolchains("@%s_toolchains//:%s_toolchain" % (name, platform))

    nodejs_repo_host_os_alias(
        name = name + "_host",
        user_node_repository_name = name,
    )
    toolchains_repo(
        name = name + "_toolchains",
        user_node_repository_name = name,
    )

def rules_nodejs_dependencies():
    maybe(
        http_archive,
        name = "bazel_skylib",
        sha256 = "c6966ec828da198c5d9adbaa94c05e3a1c7f21bd012a0b29ba8ddbccb2c93b0d",
        urls = [
            "https://github.com/bazelbuild/bazel-skylib/releases/download/1.1.1/bazel-skylib-1.1.1.tar.gz",
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/releases/download/1.1.1/bazel-skylib-1.1.1.tar.gz",
        ],
    )
    core_sha = "8f4a19de1eb16b57ac03a8e9b78344b44473e0e06b0510cec14a81f6adfdfc25"
    maybe(
        http_archive,
        name = "rules_nodejs",
        sha256 = core_sha,
        urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/4.4.6/rules_nodejs-core-4.4.6.tar.gz"],
    )
