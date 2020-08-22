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

error_message = "error TS21224: Value passed.*"

ts_library(
    name = "jasmine",
    testonly = 1,
    srcs = [
        "jasmine_types.ts",
    ],
)

ts_library(
    name = "positives",
    testonly = 1,
    srcs = [
        "positives.ts",
    ],
    expected_diagnostics = [
        "\\(31,5\\).*" + error_message,
        "\\(32,5\\).*" + error_message,
        "\\(33,5\\).*" + error_message,
        "\\(34,5\\).*" + error_message,
        "\\(35,5\\).*" + error_message,
        "\\(36,5\\).*" + error_message,
        "\\(37,5\\).*" + error_message,
    ],
    tsconfig = "//internal:tsetse/tsconfig.json",
    deps = [
        ":jasmine",
    ],
)

ts_library(
    name = "negatives",
    testonly = 1,
    srcs = [
        "negatives.ts",
    ],
    tsconfig = "//internal:tsetse/tsconfig.json",
    deps = [
        ":jasmine",
    ],
)
