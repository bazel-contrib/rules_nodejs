# Copyright 2019 The Bazel Authors. All rights reserved.
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

"""Defaults for usage without @npm//@bazel/jasmine
"""

load(":index.bzl", _jasmine_node_test = "jasmine_node_test")

def jasmine_node_test(
        deps = [],
        jasmine_deps = ["@npm//jasmine", "@npm//jasmine-core", "@npm//jasmine-reporters", "@npm//v8-coverage"],
        **kwargs):
    _jasmine_node_test(
        # When there is no @npm//@bazel/jasmine package we use @npm_bazel_jasmine instead.
        # @npm//jasmine dependency must also be added manually since without a dep on
        # @npm//@bazel/jasmine it will not be added automatically.
        deps = deps + jasmine_deps,
        jasmine = "@npm_bazel_jasmine//:jasmine__pkg",
        jasmine_entry_point = "@npm_bazel_jasmine//:jasmine_runner.js",
        **kwargs
    )
