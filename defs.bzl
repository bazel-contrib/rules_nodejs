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

"""No longer usable - you must load from index.bzl
"""

def _error(*args, **kwargs):
    fail("""
ERROR: defs.bzl has been removed from build_bazel_rules_nodejs
    
Please update your load statements to use index.bzl instead.

See https://github.com/bazelbuild/rules_nodejs/wiki#migrating-off-build_bazel_rules_nodejsdefsbzl for help.
""")

check_bazel_version = _error
nodejs_binary = _error
nodejs_test = _error
node_repositories = _error
jasmine_node_test = _error
npm_package = _error
pkg_npm = _error
npm_package_bin = _error
# ANY RULES ADDED HERE SHOULD BE DOCUMENTED, see index.for_docs.bzl

def node_modules_filegroup(packages, patterns = [], **kwargs):
    _error()

def npm_install(**kwargs):
    _error()

def yarn_install(**kwargs):
    _error()

def check_rules_nodejs_version(minimum_version_string):
    _error()
