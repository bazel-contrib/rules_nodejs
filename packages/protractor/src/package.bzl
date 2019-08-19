# Copyright 2018 The Bazel Authors. All rights reserved.
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

"""Package file which defines npm_bazel_protractor dependencies
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def npm_bazel_protractor_dependencies():
    """
    Fetch our transitive dependencies.

    If the user wants to get a different version of these, they can just fetch it
    from their WORKSPACE before calling this function, or not call this function at all.
    """

    # ts_web_test depends on the web testing rules to provision browsers.
    _maybe(
        http_archive,
        name = "io_bazel_rules_webtesting",
        sha256 = "f1f4d2c2f88d2beac64c82499a1e762b037966675dd892da89c87e39d72b33f6",
        # Using alexeagle to workaround https://github.com/bazelbuild/rules_webtesting/issues/382
        urls = ["https://github.com/alexeagle/rules_webtesting/releases/download/0.3.2/rules_webtesting.tar.gz"],
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
