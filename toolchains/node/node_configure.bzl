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
Defines a repository rule for configuring the node binary.
"""

def _impl(repository_ctx):
    if repository_ctx.attr.target_tool and repository_ctx.attr.target_tool_path:
        fail("Can only set one of target_tool or target_tool_path but both where set.")

    host_os = repository_ctx.os.name.lower()
    substitutions = {}
    default_tool_path = repository_ctx.attr.target_tool_path or repository_ctx.which("node") or ""
    substitutions["%{TOOL_ATTRS}"] = "    target_tool_path = \"%s\"\n" % default_tool_path

    if repository_ctx.attr.target_tool:
        substitutions["%{TOOL_ATTRS}"] = "    target_tool = \"%s\"\n" % repository_ctx.attr.target_tool

    repository_ctx.template(
        "BUILD",
        Label("@build_bazel_rules_nodejs//toolchains/node:BUILD.tpl"),
        substitutions,
        False,
    )

_node_configure = repository_rule(
    implementation = _impl,
    attrs = {
        "target_tool": attr.label(
            doc = "Target for a downloaded nodejs binary for the target os.",
            mandatory = False,
            allow_single_file = True,
        ),
        "target_tool_path": attr.string(
            doc = "Absolute path to a pre-installed nodejs binary for the target os.",
            mandatory = False,
        ),
    },
)

def node_configure(node_repository_names = None, **kwargs):
    """Creates an external repository with a node_toolchain target properly configured.

    Args:
      node_repository_names: list of strings
      **kwargs: all the args of the _node_configure rules
    """

    native.register_toolchains(
        "@build_bazel_rules_nodejs//toolchains/node:node_linux_toolchain",
        "@build_bazel_rules_nodejs//toolchains/node:node_osx_toolchain",
        "@build_bazel_rules_nodejs//toolchains/node:node_windows_toolchain",
    )

    if node_repository_names:
        for name in node_repository_names:
            _node_configure(
                name = "%s_config" % name,
                target_tool = "@%s//:node_bin" % name,
            )
    else:
        _node_configure(
            **kwargs
        )
