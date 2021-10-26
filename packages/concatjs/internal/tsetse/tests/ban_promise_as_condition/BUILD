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

load("//packages/concatjs:index.bzl", "ts_library")

licenses(["notice"])  # Apache 2.0

error_message = "error TS21226: Found a thenable.*"

ts_library(
    name = "positives",
    testonly = 1,
    srcs = [
        "positives.ts",
    ],
    expected_diagnostics = [
        "\\(7,7\\).*" + error_message,
        "\\(15,7\\).*" + error_message,
        "\\(23,19\\).*" + error_message,
        "\\(25,10\\).*" + error_message,
        "\\(30,34\\).*" + error_message,
        "\\(31,34\\).*" + error_message,
        "\\(38,19\\).*" + error_message,
        "\\(40,10\\).*" + error_message,
        "\\(45,34\\).*" + error_message,
        "\\(47,34\\).*" + error_message,
    ],
    tsconfig = "//packages/concatjs/internal:tsetse/tsconfig.json",
)

ts_library(
    name = "negatives",
    testonly = 1,
    srcs = ["negatives.ts"],
    tsconfig = "//packages/concatjs/internal:tsetse/tsconfig.json",
)
