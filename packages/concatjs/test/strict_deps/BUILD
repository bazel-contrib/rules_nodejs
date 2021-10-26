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

ts_library(
    name = "grandparent",
    srcs = ["grandparent.ts"],
)

ts_library(
    name = "parent",
    srcs = ["parent.ts"],
    # NB: We don't require the `@npm//semver` package for the typescript compile
    # action as the .d.ts files live in @types/semver. If the resulting
    # .js file is run downstream in a nodejs_binary rule, however, the
    # `@npm//semver` dep will be required at that point.
    # TODO: Is it desirable to automatically add @npm//semver as a transitive
    #       dep if @npm//@types/semver is a dep so that downtream nodejs_binary
    #       rules get this automatically?
    deps = [
        ":grandparent",
        "@npm//@types/semver",
    ],
)

ts_library(
    name = "strict_deps",
    srcs = ["child.ts"],
    expected_diagnostics = [
        "TS2307:child\\.ts\\(2,.*transitive dependency.*not allowed",
    ],
    deps = [":parent"],
)

ts_library(
    name = "strict_deps_npm",
    srcs = ["child2.ts"],
    expected_diagnostics = [
        "TS2307:child2\\.ts\\(2,.*transitive dependency.*not allowed",
    ],
    deps = [":parent"],
)
