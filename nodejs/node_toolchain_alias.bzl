# Copyright 2019 The Bazel Authors. All rights reserved.
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

"""Node toolchain aliases using toolchain resolution."""

load(":semantics.bzl", "semantics")
load(":toolchain.bzl", "NodeInfo")

def _node_runtime_alias(ctx):
    """Implementation of node_runtime_alias using toolchain resolution."""
    toolchain_info = ctx.toolchains[semantics.NODE_RUNTIME_TOOLCHAIN_TYPE]
    toolchain = toolchain_info.nodeinfo
    template_variable_info = toolchain_info.template_variables
    default_info = toolchain_info.default
    return [
        toolchain_info,
        toolchain,
        template_variable_info,
        default_info,
    ]

node_runtime_alias = rule(
    implementation = _node_runtime_alias,
    toolchains = [semantics.NODE_RUNTIME_TOOLCHAIN],
)

def _node_host_runtime_alias(ctx):
    """Implementation of node_host_runtime_alias using toolchain resolution."""
    runtime = ctx.attr._runtime
    toolchain = runtime[NodeInfo]
    template_variable_info = runtime[platform_common.TemplateVariableInfo]
    default_info = runtime[DefaultInfo]
    toolchain_info = platform_common.ToolchainInfo(nodeinfo = toolchain)
    return [
        toolchain,
        template_variable_info,
        toolchain_info,
        default_info,
    ]

node_host_runtime_alias = rule(
    implementation = _node_host_runtime_alias,
    attrs = {
        "_runtime": attr.label(
            default = Label("//nodejs:current_node_runtime"),
            providers = [
                NodeInfo,
                platform_common.TemplateVariableInfo,
            ],
            cfg = "exec",
        ),
    },
    provides = [
        NodeInfo,
        platform_common.TemplateVariableInfo,
        platform_common.ToolchainInfo,
    ],
)

def _node_toolchain_alias(ctx):
    """An implementation of node_toolchain_alias using toolchain resolution."""
    toolchain_info = ctx.toolchains[semantics.NODE_TOOLCHAIN_TYPE]
    toolchain = toolchain_info.nodeinfo

    return [
        toolchain_info,
        toolchain,
    ]

node_toolchain_alias = rule(
    implementation = _node_toolchain_alias,
    toolchains = [semantics.NODE_TOOLCHAIN],
)
