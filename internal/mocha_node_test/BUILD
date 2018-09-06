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

load(":mocha_node_test.bzl", "mocha_node_test")
load("//internal/js_library:js_library.bzl", "js_library")

exports_files([
    "mocha_runner.js",
    # Exported to be consumed for generating skydoc.
    "mocha_node_test.bzl",
])

js_library(
    name = "exampleLib",
    srcs = glob(["exampleLib/*.js"]),
    module_name = "example-lib",
    module_root = "exampleLib/index.js",
)

mocha_node_test(
    name = "test",
    data = [
        ":testOne.js",
        ":testTwo.js",
        ":exampleLib",
    ],
    test_entrypoints = [
        "internal/mocha_node_test/testOne.js",
        "internal/mocha_node_test/testTwo.js",
    ],
    node_modules = "//internal/test:node_modules",
)


