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
"Common web_test attributes"

load("@build_bazel_rules_nodejs//internal/common:sources_aspect.bzl", "sources_aspect")

# Attributes shared by any web_test rule (ts_web_test, karma_web_test, protractor_web_test)
COMMON_WEB_TEST_ATTRS = {
    "srcs": attr.label_list(
        doc = "A list of JavaScript test files",
        allow_files = [".js"],
    ),
    "configuration_env_vars": attr.string_list(
        doc = """Pass these configuration environment variables to the resulting binary.
        Chooses a subset of the configuration environment variables (taken from ctx.var), which also
        includes anything specified via the --define flag.
        Note, this can lead to different outputs produced by this rule.""",
        default = [],
    ),
    "data": attr.label_list(
        doc = "Runtime dependencies",
        allow_files = True,
    ),
    "deps": attr.label_list(
        doc = "Other targets which produce JavaScript such as `ts_library`",
        allow_files = True,
        aspects = [sources_aspect],
    ),
}
