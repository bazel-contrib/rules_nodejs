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

"""Defines a repository rule for configuring the node executable.
"""

def _impl(repository_ctx):
    if repository_ctx.attr.target_tool and repository_ctx.attr.target_tool_path:
        fail("Can only set one of target_tool or target_tool_path but both where set.")

    if repository_ctx.attr.target_tool:
        substitutions = {"%{TOOL_ATTRS}": "    target_tool = \"%s\"\n" % repository_ctx.attr.target_tool}
    else:
        if repository_ctx.attr.target_tool_path:
            default_tool_path = repository_ctx.attr.target_tool_path
        else:
            default_tool_path = repository_ctx.which("node")
            if not default_tool_path:
                fail("No node found on local path. node must available on the PATH or target_tool_path must be provided")
        substitutions = {"%{TOOL_ATTRS}": "    target_tool_path = \"%s\"\n" % default_tool_path}

    repository_ctx.template(
        "BUILD",
        Label("@build_bazel_rules_nodejs//toolchains/node:BUILD.tpl"),
        substitutions,
        False,
    )

node_toolchain_configure = repository_rule(
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
    doc = """Creates an external repository with a node_toolchain //:toolchain target properly configured.""",
)
