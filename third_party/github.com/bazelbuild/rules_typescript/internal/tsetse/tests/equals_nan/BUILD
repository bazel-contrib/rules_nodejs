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

ts_library(
    name = "positives",
    testonly = 1,
    srcs = [
        "positives.ts",
    ],
    expected_diagnostics = [
        "\\(2,19\\): error TS21223: x === NaN is always false; use isNaN\\(x\\) instead",
        "\\(6,5\\): error TS21223: x === NaN is always false; use isNaN\\(x\\) instead",
        "\\(7,5\\): error TS21223: x == NaN is always false; use isNaN\\(x\\) instead",
        "\\(8,5\\): error TS21223: x !== NaN is always true; use !isNaN\\(x\\) instead",
        "\\(9,5\\): error TS21223: x != NaN is always true; use !isNaN\\(x\\) instead",
        "\\(11,1\\): error TS21223: x === NaN is always false; use isNaN\\(x\\) instead",
        "\\(12,1\\): error TS21223: x === NaN is always false; use isNaN\\(x\\) instead",
    ],
)

ts_library(
    name = "negatives",
    testonly = 1,
    srcs = [
        "negatives.ts",
    ],
)
