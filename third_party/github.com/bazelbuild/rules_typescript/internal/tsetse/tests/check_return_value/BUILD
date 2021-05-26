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

load("@npm_bazel_typescript//:index.bzl", "ts_library")

licenses(["notice"])  # Apache 2.0

error_message = "TS21222: return value is unused.\\n\\tSee http://tsetse.info/check-return-value"

ts_library(
    name = "no_expected_diagnostics_test",
    testonly = 1,
    srcs = ["no_expected_diagnostics.ts"],
    tsconfig = "//internal:tsetse/tsconfig.json",
)

ts_library(
    name = "expected_diagnostics_test",
    testonly = 1,
    srcs = ["expected_diagnostics.ts"],
    expected_diagnostics = [
        "\\(6,1\\).*" + error_message,
        "\\(8,1\\).*" + error_message,
        "\\(12,1\\).*" + error_message,
        "\\(16,1\\).*" + error_message,
        "\\(19,1\\).*" + error_message,
    ],
    tsconfig = "//internal:tsetse/tsconfig.json",
)

ts_library(
    name = "user_defined_check_return_value",
    testonly = 1,
    srcs = ["user_defined_check_return_value.ts"],
    tsconfig = "//internal:tsetse/tsconfig.json",
)

ts_library(
    name = "unused_return_value_user_defined_function",
    testonly = 1,
    srcs = ["unused_return_value_user_defined_function.ts"],
    expected_diagnostics = [
        "\\(4,1\\).*" + error_message,
        "\\(5,1\\).*" + error_message,
        "\\(7,1\\).*" + error_message,
        "\\(9,1\\).*" + error_message,
        "\\(15,1\\).*" + error_message,
    ],
    tsconfig = "//internal:tsetse/tsconfig.json",
    deps = [
        ":user_defined_check_return_value",
        "@npm//@types/jasmine",
    ],
)
