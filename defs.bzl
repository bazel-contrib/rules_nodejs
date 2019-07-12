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

load("//internal/common:check_bazel_version.bzl", _check_bazel_version = "check_bazel_version")
load("//internal/common:check_version.bzl", "check_version")
load("//internal/history-server:history_server.bzl", _history_server = "history_server")
load("//internal/http-server:http_server.bzl", _http_server = "http_server")
load("//internal/jasmine_node_test:jasmine_node_test.bzl", _jasmine_node_test = "jasmine_node_test")
load(
    "//internal/node:node.bzl",
    _nodejs_binary = "nodejs_binary_macro",
    _nodejs_test = "nodejs_test_macro",
)
load("//internal/node:node_repositories.bzl", _node_repositories = "node_repositories")
load("//internal/npm_install:npm_install.bzl", _npm_install = "npm_install", _yarn_install = "yarn_install")
load("//internal/npm_package:npm_package.bzl", _npm_package = "npm_package")
load("//internal/rollup:rollup_bundle.bzl", _rollup_bundle = "rollup_bundle")

check_bazel_version = _check_bazel_version
nodejs_binary = _nodejs_binary
nodejs_test = _nodejs_test
node_repositories = _node_repositories
jasmine_node_test = _jasmine_node_test
rollup_bundle = _rollup_bundle
npm_package = _npm_package
history_server = _history_server
http_server = _http_server
# ANY RULES ADDED HERE SHOULD BE DOCUMENTED, run yarn skydoc to verify

# Allows us to avoid a transitive dependency on bazel_skylib from leaking to users
def dummy_bzl_library(name, **kwargs):
    native.filegroup(name = name)

# @unsorted-dict-items
COMMON_REPLACEMENTS = {
    # Replace loads from @bazel_skylib with the dummy rule above
    "(load\\(\"@bazel_skylib//:bzl_library.bzl\", \"bzl_library\"\\))": "# bazel_skylib mocked out\n# $1\nload(\"@build_bazel_rules_nodejs//:defs.bzl\", bzl_library = \"dummy_bzl_library\")",
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

# This version is synced with the version in package.json.
# It will be automatically synced via the npm "version" script
# that is run when running `npm version` during the release
# process. See `Releasing` section in README.md.
VERSION = "0.33.0"

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
