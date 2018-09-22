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
load("//internal/node:node.bzl",
     _nodejs_binary = "nodejs_binary_macro",
     _nodejs_test = "nodejs_test_macro")
load("//internal/node:node_repositories.bzl",_node_repositories = "node_repositories")
load("//internal/jasmine_node_test:jasmine_node_test.bzl", _jasmine_node_test = "jasmine_node_test")
load("//internal/npm_install:npm_install.bzl", _npm_install = "npm_install", _yarn_install = "yarn_install")
load("//internal/rollup:rollup_bundle.bzl", _rollup_bundle = "rollup_bundle")
load("//internal/npm_package:npm_package.bzl", _npm_package = "npm_package")
load("//internal/history-server:history_server.bzl", _history_server = "history_server")
load("//internal/http-server:http_server.bzl", _http_server = "http_server")
load("//:package.bzl", _check_rules_nodejs_version = "check_rules_nodejs_version")

check_bazel_version = _check_bazel_version
nodejs_binary = _nodejs_binary
nodejs_test = _nodejs_test
node_repositories = _node_repositories
jasmine_node_test = _jasmine_node_test
npm_install = _npm_install
yarn_install = _yarn_install
rollup_bundle = _rollup_bundle
npm_package = _npm_package
history_server = _history_server
http_server = _http_server
# ANY RULES ADDED HERE SHOULD BE DOCUMENTED, run yarn skydoc to verify

check_rules_nodejs_version = _check_rules_nodejs_version

def node_modules_filegroup(packages, patterns=[], **kwargs):
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
