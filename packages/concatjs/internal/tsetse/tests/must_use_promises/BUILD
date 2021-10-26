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

error_message = "TS21225: All Promises in async functions must either be awaited or used in an expression."

ts_library(
    name = "positives",
    testonly = 1,
    srcs = [
        "positives.ts",
    ],
    expected_diagnostics = [
        "\\(29,3\\)" + error_message,
        "\\(30,3\\)" + error_message,
        "\\(31,3\\)" + error_message,
        "\\(32,3\\)" + error_message,
        "\\(34,3\\)" + error_message,
    ],
    tsconfig = "//packages/concatjs/internal:tsetse/tsconfig.json",
)
