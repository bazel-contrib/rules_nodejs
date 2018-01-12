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

""" Public API surface is re-exported here.

Users should not load files under "/internal"
"""
load("//internal:check_bazel_version.bzl", _check_bazel_version = "check_bazel_version")
load("//internal:node.bzl", 
  _nodejs_binary_macro = "nodejs_binary_macro", 
  _nodejs_test_macro = "nodejs_test_macro"
)
load("//internal:jasmine_node_test.bzl", _jasmine_node_test = "jasmine_node_test")
load("//internal:node_install.bzl", _node_repositories = "node_repositories")
load("//internal:npm_install.bzl", _npm_install = "npm_install")

check_bazel_version = _check_bazel_version
jasmine_node_test = _jasmine_node_test
node_repositories = _node_repositories
npm_install = _npm_install
nodejs_binary = _nodejs_binary_macro
nodejs_test = _nodejs_test_macro
