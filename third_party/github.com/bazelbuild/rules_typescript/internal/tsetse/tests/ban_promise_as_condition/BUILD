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

licenses(["notice"])  # Apache 2.0

load("//internal:defaults.bzl", "ts_library")

error_message = "error TS21226: Found a thenable.*"

ts_library(
    name = "jasmine",
    testonly = 1,
)

ts_library(
    name = "positives",
    testonly = 1,
    tsconfig = "//internal/tsetse:tsconfig.json",
    srcs = [
        "positives.ts",
    ],
    expected_diagnostics = [
        "\(7,7\).*" + error_message,
        "\(15,7\).*" + error_message,
        "\(23,19\).*" + error_message,
        "\(25,10\).*" + error_message,
        "\(30,34\).*" + error_message,
        "\(31,34\).*" + error_message,
        "\(37,19\).*" + error_message,
        "\(39,10\).*" + error_message,
        "\(44,34\).*" + error_message,
        "\(45,34\).*" + error_message,
    ],
    deps = [
    ],
)

ts_library(
    name = "negatives",
    testonly = 1,
    tsconfig = "//internal/tsetse:tsconfig.json",
    srcs = ["negatives.ts"],
    deps = [
    ],
)
