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

"""Public API surface is re-exported here.

Users should not load files under "/internal"
"""

load("//:version.bzl", "VERSION")
load("//internal/common:check_bazel_version.bzl", _check_bazel_version = "check_bazel_version")
load("//internal/common:check_version.bzl", "check_version")
load("//internal/common:copy_to_bin.bzl", _copy_to_bin = "copy_to_bin")
load("//internal/common:params_file.bzl", _params_file = "params_file")
load("//internal/generated_file_test:generated_file_test.bzl", _generated_file_test = "generated_file_test")
load(
    "//internal/node:node.bzl",
    _nodejs_binary = "nodejs_binary",
    _nodejs_test = "nodejs_test",
)
load("//internal/node:node_repositories.bzl", _node_repositories = "node_repositories")
load("//internal/node:npm_package_bin.bzl", _npm_bin = "npm_package_bin")
load("//internal/npm_install:npm_install.bzl", _npm_install = "npm_install", _yarn_install = "yarn_install")
load("//internal/node_module_library/node_module_library.bzl", _node_module_library = "node_module_library")
load("//internal/pkg_npm:pkg_npm.bzl", _pkg_npm = "pkg_npm")
load("//internal/pkg_web:pkg_web.bzl", _pkg_web = "pkg_web")

check_bazel_version = _check_bazel_version
nodejs_binary = _nodejs_binary
nodejs_test = _nodejs_test
node_repositories = _node_repositories
node_module_library = _node_module_library
pkg_npm = _pkg_npm
npm_package_bin = _npm_bin
pkg_web = _pkg_web
copy_to_bin = _copy_to_bin
params_file = _params_file
generated_file_test = _generated_file_test
# ANY RULES ADDED HERE SHOULD BE DOCUMENTED, see index.for_docs.bzl

# Allows us to avoid a transitive dependency on bazel_skylib from leaking to users
def dummy_bzl_library(name, **kwargs):
    native.filegroup(name = name)

# @unsorted-dict-items
COMMON_REPLACEMENTS = {
    # Replace loads from @bazel_skylib with the dummy rule above
    "(load\\(\"@bazel_skylib//:bzl_library.bzl\", \"bzl_library\"\\))": "# bazel_skylib mocked out\n# $1\nload(\"@build_bazel_rules_nodejs//:index.bzl\", bzl_library = \"dummy_bzl_library\")",
    # Make sure we don't try to load from under tools/ which isn't in the distro
    "(load\\(\"//:tools/defaults.bzl\", .*\\))": "# defaults.bzl not included in distribution\n# $1",
    # Cleanup up package.json @bazel/foobar package deps for published packages:
    # "@bazel/foobar": "file:///..." => "@bazel/foobar": "0.0.0-PLACEHOLDER"
    "\"@bazel/([a-zA-Z_-]+)\":\\s+\"(file|bazel)[^\"]+\"": "\"@bazel/$1\": \"0.0.0-PLACEHOLDER\"",
}

def node_modules_filegroup(packages, patterns = [], **kwargs):
    native.filegroup(
        srcs = native.glob(["/".join([
            "node_modules",
            pkg,
            "**",
            ext,
        ]) for pkg in packages for ext in [
            "*.js",
            "*.json",
            "*.d.ts",
        ]] + patterns),
        **kwargs
    )

def npm_install(**kwargs):
    # Just in case the user didn't install nodejs, do it now
    _node_repositories()
    _npm_install(**kwargs)

def yarn_install(**kwargs):
    # Just in case the user didn't install nodejs, do it now
    _node_repositories()
    _yarn_install(**kwargs)

# Currently used Bazel version. This version is what the rules here are tested
# against.
# This version should be updated together with the version of the Bazel
# in .bazelversion. This is asserted in //internal:bazel_version_test.
BAZEL_VERSION = "3.0.0"

# Versions of Bazel which users should be able to use.
# Ensures we don't break backwards-compatibility,
# accidentally forcing users to update their LTS-supported bazel.
# These are the versions used when testing nested workspaces with
# bazel_integration_test.
SUPPORTED_BAZEL_VERSIONS = [
    # TODO: add LTS versions of bazel like 1.0.0, 2.0.0
    BAZEL_VERSION,
]

def check_rules_nodejs_version(minimum_version_string):
    """
    Verify that a minimum build_bazel_rules_nodejs is loaded a WORKSPACE.

    This should be called from the `WORKSPACE` file so that the build fails as
    early as possible. For example:

    ```
    # in WORKSPACE:
    load("@build_bazel_rules_nodejs//:package.bzl", "check_rules_nodejs_version")
    check_rules_nodejs_version("0.11.2")
    ```

    Args:
      minimum_version_string: a string indicating the minimum version
    """
    if not check_version(VERSION, minimum_version_string):
        fail("\nCurrent build_bazel_rules_nodejs version is {}, expected at least {}\n".format(
            VERSION,
            minimum_version_string,
        ))
