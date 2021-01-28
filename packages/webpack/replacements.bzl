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

"""Replacements for @bazel/webpack package
"""

load("@build_bazel_rules_nodejs//:index.bzl", "COMMON_REPLACEMENTS")

WEBPACK_REPLACEMENTS = dict(
    COMMON_REPLACEMENTS,
    **{
        # This BEGIN-DEV fencing is required as files pulled in from
        # @build_bazel_rules_typescript//:npm_bazel_typescript_package
        # use this alternate fencing
        "(#|\\/\\/)\\s+BEGIN-DEV-ONLY[\\w\\W]+?(#|\\/\\/)\\s+END-DEV-ONLY": "",
        # Replace the worker filegroup with the entire @bazel/typescript node_module and its transitive node_modules
        "//packages/webpack/internal/worker:filegroup": "//@bazel/webpack",
        # Change the worker entry point from the checked_in_ts_project target to the checked in .js
        "//packages/webpack/internal/worker:worker_adapter": "//@bazel/webpack/internal/worker:index.js",
    }
)
