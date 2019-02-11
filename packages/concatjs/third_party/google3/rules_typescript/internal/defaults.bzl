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

"Defaults for rules_typescript repository not meant to be used downstream"

load(
    "@npm_bazel_typescript//:defs.bzl",
    _ts_library = "ts_library",
)

# We can't use the defaults for ts_library compiler and ts_web_test_suite karma
# internally because the defaults are .js dependencies on the npm packages that are
# published and internally we are building the things themselves to publish to npm
INTERNAL_TS_LIBRARY_COMPILER = "@npm_bazel_typescript//internal:tsc_wrapped_bin"

def ts_library(compiler = INTERNAL_TS_LIBRARY_COMPILER, **kwargs):
    _ts_library(compiler = compiler, **kwargs)
