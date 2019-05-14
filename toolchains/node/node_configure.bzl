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

load("//internal/common:os_name.bzl", "OS_ARCH_NAMES")

def _impl(repository_ctx):
    substitutions = None
    host_os = repository_ctx.os.name.lower()
    if repository_ctx.attr.node_repository_names:
        target_tool = ""
        host_tool = ""
        target_repo_name = ""
        for repo_name in repository_ctx.attr.node_repository_names:
            if repository_ctx.attr.os in repo_name:
                target_tool = "@%s//:node" % repo_name
                target_repo_name = repo_name

            if host_os == "mac os x":
                host_os = "darwin"

            if "windows" in host_os:
                host_os = "windows"

            if host_os in repo_name:
                host_tool = "@%s//:node" % repo_name

        if not target_tool or not host_tool:
            fail(("No host_tool for Host OS '%s' and/or no target_tool for provided OS '%s' found with given nodejs" +
                  " repository names: %s.") % (host_os, repository_ctx.attr.os, repository_ctx.attr.node_repository_names))

        substitutions = {
            "%{ARCH}": "%s" % repository_ctx.attr.arch,
            "%{NODE_HOST_TOOL}": "%s" % host_tool,
            "%{NODE_TARGET_ARGS}": "@%s//:bin/node_args.sh" % target_repo_name,
            "%{NODE_TARGET_RUNFILES}": "@%s//:node_runfiles" % target_repo_name,
            "%{NODE_TARGET_TOOL}": "%s" % target_tool,
            "%{OS}": "%s" % repository_ctx.attr.os,
        }
        template = Label("@build_bazel_rules_nodejs//toolchains/node:BUILD.target.tpl")

    else:
        node_tool_path = repository_ctx.attr.local_path or repository_ctx.which("node") or ""
        substitutions = {"%{NODE_PATH}": "%s" % node_tool_path}
        template = Label("@build_bazel_rules_nodejs//toolchains/node:BUILD.path.tpl")

    repository_ctx.template(
        "BUILD",
        template,
        substitutions,
        False,
    )

_node_configure = repository_rule(
    implementation = _impl,
    attrs = {
        "arch": attr.string(
            mandatory = True,
            doc = "Default target architecture",
        ),
        "host_tool": attr.label(
            doc = "Target for a downloaded nodejs binary for the host os.",
            mandatory = False,
            allow_single_file = True,
        ),
        "host_tool_path": attr.string(
            doc = "Absolute path to a pre-installed nodejs binary for the host os.",
            mandatory = False,
        ),
        # "node_repository_names": attr.string_list(
        #     mandatory = False,
        # ),
        "os": attr.string(
            mandatory = True,
            doc = "Default target OS",
        ),
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

def node_configure(node_repository_name):
    """Creates an external repository with a node_toolchain target properly configured.

    Args:
      node_repository_name: list of strings
    """

    native.register_toolchains(
        "@build_bazel_rules_nodejs//toolchains/node:node_linux_toolchain",
        "@build_bazel_rules_nodejs//toolchains/node:node_osx_toolchain",
        "@build_bazel_rules_nodejs//toolchains/node:node_windows_toolchain",
    )

    if node_repositories:
        for os, arch in OS_ARCH_NAMES:
            _node_configure(
                name = "nodejs_config_%s_%s" % (os, arch),
                os = os,
                arch = arch,
                host_tool = "@nodejs//:node"
                node_repository_names = node_repositories
            )
