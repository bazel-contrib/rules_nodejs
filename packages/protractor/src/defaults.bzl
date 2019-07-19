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

""" Defaults for usage without @npm//@bazel/protractor
"""

load(
    "@npm_bazel_protractor//:index.bzl",
    _protractor_web_test = "protractor_web_test",
    _protractor_web_test_suite = "protractor_web_test_suite",
)

INTERNAL_PROTRACTOR = "@npm//protractor"
INTERNAL_PROTRACTOR_ENTRY_POINT = "@npm_bazel_protractor//:protractor.js"

def protractor_web_test(data = [], **kwargs):
    _protractor_web_test(
        # When there is no @npm//@bazel/protractor package we use @npm_bazel_protractor instead.
        # @npm_bazel_protractor//:utils_lib dependency must also be added manually since without a dep on
        # @npm//@bazel/protractor "@bazel/protractor/protractor-utils" will not resolve.
        data = data + ["@npm_bazel_protractor//:utils_lib"],
        protractor = INTERNAL_PROTRACTOR,
        protractor_entry_point = INTERNAL_PROTRACTOR_ENTRY_POINT,
        **kwargs
    )

def protractor_web_test_suite(data = [], **kwargs):
    _protractor_web_test_suite(
        # When there is no @npm//@bazel/protractor package we use @npm_bazel_protractor instead.
        # @npm_bazel_protractor//:utils_lib dependency must also be added manually since without a dep on
        # @npm//@bazel/protractor "@bazel/protractor/protractor-utils" will not resolve.
        data = data + ["@npm_bazel_protractor//:utils_lib"],
        protractor = INTERNAL_PROTRACTOR,
        protractor_entry_point = INTERNAL_PROTRACTOR_ENTRY_POINT,
        **kwargs
    )
