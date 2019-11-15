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
load("//internal/jasmine_node_test:jasmine_node_test.bzl", _jasmine_node_test = "jasmine_node_test")
load(
    "//internal/node:node.bzl",
    _nodejs_binary = "nodejs_binary",
    _nodejs_test = "nodejs_test",
)
load("//internal/node:node_repositories.bzl", _node_repositories = "node_repositories")
load("//internal/node:npm_package_bin.bzl", _npm_bin = "npm_package_bin")
load("//internal/npm_install:npm_install.bzl", _npm_install = "npm_install", _yarn_install = "yarn_install")
load("//internal/npm_package:npm_package.bzl", _npm_package = "npm_package")
load(":index.bzl", "VERSION")

check_bazel_version = _check_bazel_version
nodejs_binary = _nodejs_binary
nodejs_test = _nodejs_test
node_repositories = _node_repositories
jasmine_node_test = _jasmine_node_test
npm_package = _npm_package
npm_package_bin = _npm_bin
# ANY RULES ADDED HERE SHOULD BE DOCUMENTED, see index.for_docs.bzl

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
