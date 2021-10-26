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

"""Replacements for @bazel/typescript package
"""

load("@build_bazel_rules_nodejs//:index.bzl", "COMMON_REPLACEMENTS")

TYPESCRIPT_REPLACEMENTS = dict(
    COMMON_REPLACEMENTS,
    **{
        "#@external ": "",
        "//packages/concatjs/web_test:karma_bin": "@npm//karma/bin:karma",
        # This BEGIN-DEV fencing is required as files pulled in from
        # //packages/concatjs:npm_bazel_typescript_package
        # use this alternate fencing
        "(#|\\/\\/)\\s+BEGIN-DEV-ONLY[\\w\\W]+?(#|\\/\\/)\\s+END-DEV-ONLY": "",
        # This file gets vendored into our repo
        "//packages/concatjs/internal:common": "//@bazel/concatjs/internal:common",
        # Replace the local compiler label with one that comes from npm
        "//packages/concatjs/internal:tsc_wrapped_bin": "//@bazel/concatjs/bin:tsc_wrapped",
    }
)
