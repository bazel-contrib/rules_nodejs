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

package(default_visibility = ["//visibility:public"])

load("//internal/mocha:mocha_node_test.bzl", "mocha_node_test")
load("//internal/js_library:js_library.bzl", "js_library")
load("@build_bazel_rules_nodejs//:internal/common/typescript_mock_lib.bzl", "mock_typescript_lib")

js_library(
    name = "example_lib",
    srcs = glob(["example_lib/*.js"]),
    module_name = "example-lib",
    module_root = "example_lib/index.js",
)

mocha_node_test(
    name = "test",
    srcs = [
        "one_test.js",
        "two_test.js",
    ],
    data = [
        ":example_lib",
    ],
    node_modules = "//internal/test:node_modules",
)

mocha_node_test(
    name = "fail_test",
    srcs = [
        "fail_test.js",
    ],
    node_modules = "//internal/test:node_modules",
    expected_exit_code = 3,
)

mocha_node_test(
    name = "test_no_tests_found",
    srcs = [
        "no_tests_found_test.js",
    ],
    node_modules = "//internal/test:node_modules",
    expected_exit_code = 4,
)

mock_typescript_lib(
    name = "mock_ts_lib",
    srcs = ["decrement.js"],
)

mocha_node_test(
    name = "typescript_inputs",
    srcs = [
        "decrement.spec.js",
    ],
    data = [
        ":mock_ts_lib"
    ],
    node_modules = "//internal/test:node_modules",
)