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

package(default_visibility = [
    "//third_party/bazel_rules/rules_typescript/internal:__subpackages__",
])

exports_files([
    "launcher_template.sh",
    # Exported to be consumed for generating skydoc.
    "ts_devserver.bzl",
])

filegroup(
    name = "source_tree",
    srcs = glob(["**/*"]),
)

filegroup(
    name = "npm_package_assets",
    srcs = [
        "BUILD",
        "launcher_template.sh",
        "package.json",
        "ts_devserver.bzl",
        "yarn.lock",
    ],
    visibility = ["//internal:__pkg__"],
)
