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

If you depend on another ruleset that still depends on defs.bzl, you must update:

http_archive(
    name = "io_bazel_rules_sass",
    sha256 = "617e444f47a1f3e25eb1b6f8e88a2451d54a2afdc7c50518861d9f706fc8baaa",
    urls = [
        "https://github.com/bazelbuild/rules_sass/archive/1.23.7.zip",
        "https://mirror.bazel.build/github.com/bazelbuild/rules_sass/archive/1.23.7.zip",
    ],
    strip_prefix = "rules_sass-1.23.7",
)

http_archive(
    name = "io_bazel_rules_docker",
    sha256 = "c9b298ec18157fc8ada915bb958dfd1c3d98ec247b5aca29efb1d222b5f9e7df",
    # TODO: update to next release after 17 December 2019 that includes this commit
    strip_prefix = "rules_docker-8c28cb910f1b93d0fa3289a11ec62ef1710172d5",
    urls = ["https://github.com/bazelbuild/rules_docker/archive/8c28cb910f1b93d0fa3289a11ec62ef1710172d5.zip"],
)
""")

check_bazel_version = _error
nodejs_binary = _error
nodejs_test = _error
node_repositories = _error
jasmine_node_test = _error
npm_package = _error
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
