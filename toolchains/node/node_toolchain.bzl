# Copyright 2018 The Bazel Authors. All rights reserved.
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
"""
This module implements the node toolchain rule.
"""

NodeInfo = provider(
    doc = "Information about how to invoke the node binary.",
    fields = {
        "tool_path": "Path to an existing nodejs executable",
        "tool_target": "A hermetically downloaded nodejs executable target.",
    },
)

def _node_toolchain_impl(ctx):
    if not ctx.attr.tool_path and not ctx.attr.tool_target:
        print("No nodejs binary was found or built, executing run for rules_nodejs targets might not work.")
    toolchain_info = platform_common.ToolchainInfo(
        nodeinfo = NodeInfo(
            tool_path = ctx.attr.tool_path,
            tool_target = ctx.attr.tool_target,
        ),
    )
    return [toolchain_info]

node_toolchain = rule(
    implementation = _node_toolchain_impl,
    attrs = {
        "os": attr.string(
            mandatory = True,
            doc = "Default target OS",
        ),
        "arch": attr.string(
            mandatory = True,
            doc = "Default target architecture",
        ),
        "target_tool_path": attr.string(
            doc = "Absolute path to a pre-installed nodejs binary for the target os.",
            mandatory = False,
        ),
        "target_tool": attr.label(
            doc = "Target for a downloaded nodejs binary for the target os.",
            mandatory = False,
            allow_single_file = True,
        ),
        "host_tool_path": attr.string(
            doc = "Absolute path to a pre-installed nodejs binary for the host os.",
            mandatory = False,
        ),
        "host_tool": attr.label(
            doc = "Target for a downloaded nodejs binary for the host os.",
            mandatory = False,
            allow_single_file = True,
        ),
    },
)
