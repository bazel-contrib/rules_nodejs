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

"""Testing for node toolchains

This test verifies that if --platforms=@build_bazel_rules_nodejs//toolchains/node:<platform> is set then
the correct node path is available to rules via
ctx.toolchains["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"].nodeinfo.tool_files[0].path
"""

load("//internal/node:node_repositories.bzl", "NODE_EXTRACT_DIR")

_SCRIPT_TEMPLATE = """#!/bin/bash
EXPECTED_NODE_PATH="{expected_node_path}"
TOOLCHAIN_NODE_PATH="{toolchain_node_path}"
if [ "$EXPECTED_NODE_PATH" != "$TOOLCHAIN_NODE_PATH" ]; then
    echo "Expected platform node path to be '$EXPECTED_NODE_PATH' but got '$TOOLCHAIN_NODE_PATH'"
    exit 1
fi
"""

_ATTRS = {
    "platform": attr.string(
        values = ["linux_amd64", "linux_arm64", "linux_s390x", "darwin_amd64", "darwin_arm64", "windows_amd64"],
    ),
}

def _nodejs_toolchain_test(ctx):
    script = ctx.actions.declare_file(ctx.label.name)

    is_windows = ctx.attr.platform == "windows_amd64"
    expected_node_path = "external/nodejs_%s/%s/%s" % (ctx.attr.platform, NODE_EXTRACT_DIR, "node.exe" if is_windows else "bin/node")

    ctx.actions.write(
        script,
        _SCRIPT_TEMPLATE.format(
            expected_node_path = expected_node_path,
            toolchain_node_path = ctx.toolchains["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"].nodeinfo.tool_files[0].path,
        ),
        is_executable = True,
    )
    return [DefaultInfo(executable = script)]

nodejs_toolchain_test = rule(
    implementation = _nodejs_toolchain_test,
    attrs = _ATTRS,
    test = True,
    toolchains = [
        "@build_bazel_rules_nodejs//toolchains/node:toolchain_type",
        "@bazel_tools//tools/sh:toolchain_type",
    ],
)
