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

"""This module implements the node toolchain rule.
"""

NodeInfo = provider(
    doc = "Information about how to invoke the node executable.",
    fields = {
        "target_tool_path": "Path to the nodejs executable for the target platform.",
        "tool_files": """Files required in runfiles to make the nodejs executable available.

May be empty if the target_tool_path points to a locally installed node binary.""",
    },
)

def node_toolchain_providers(ctx, toolchain_info):
    """Convert the toolchain_info struct to Providers returned by the toolchain.

       This is exposed as part of the workaround for https://github.com/bazelbuild/bazel/issues/14009
    """
    return [
        DefaultInfo(
            files = depset(toolchain_info.tool_files),
            runfiles = ctx.runfiles(files = toolchain_info.tool_files),
        ),
        platform_common.ToolchainInfo(
            nodeinfo = NodeInfo(
                target_tool_path = toolchain_info.target_tool_path,
                tool_files = toolchain_info.tool_files,
            ),
        ),
        # Make the $(NODE_PATH) variable available in places like genrules.
        # See https://docs.bazel.build/versions/main/be/make-variables.html#custom_variables
        # Note that genrule seems to have a bug: this only works if the node_toolchain target
        # itself is used by the toolchains attribute of genrule, not the toolchain_type.
        platform_common.TemplateVariableInfo({
            "NODE_PATH": toolchain_info.target_tool_path,
        }),
    ]

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return "external/" + file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _node_toolchain_impl(ctx):
    if ctx.attr.target_tool and ctx.attr.target_tool_path:
        fail("Can only set one of target_tool or target_tool_path but both were set.")
    if not ctx.attr.target_tool and not ctx.attr.target_tool_path:
        fail("Must set one of target_tool or target_tool_path.")

    tool_files = []
    target_tool_path = ctx.attr.target_tool_path

    if ctx.attr.target_tool:
        tool_files = ctx.attr.target_tool.files.to_list()
        target_tool_path = _to_manifest_path(ctx, tool_files[0])

    return node_toolchain_providers(ctx, struct(tool_files = tool_files, target_tool_path = target_tool_path))

node_toolchain = rule(
    implementation = _node_toolchain_impl,
    attrs = {
        "target_tool": attr.label(
            doc = "A hermetically downloaded nodejs executable target for the target platform.",
            mandatory = False,
            allow_single_file = True,
        ),
        "target_tool_path": attr.string(
            doc = "Path to an existing nodejs executable for the target platform.",
            mandatory = False,
        ),
    },
    doc = """Defines a node toolchain.

For usage see https://docs.bazel.build/versions/main/toolchains.html#defining-toolchains.
""",
)
