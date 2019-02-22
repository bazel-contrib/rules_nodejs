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

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load(
    ":defaults.bzl",
    _k8s_commit = "k8s_commit",
    _k8s_org = "k8s_org",
    _k8s_prefix = "k8s_prefix",
    _k8s_repo = "k8s_repo",
    _k8s_repo_tools_commit = "k8s_repo_tools_commit",
    _k8s_repo_tools_prefix = "k8s_repo_tools_prefix",
    _k8s_repo_tools_repo = "k8s_repo_tools_repo",
    _k8s_repo_tools_sha = "k8s_repo_tools_sha",
    _k8s_sha256 = "k8s_sha256",
)
load("//internal/common:os_name.bzl", "OS_ARCH_NAMES")

def _impl(repository_ctx):
    substitutions = None
    host_os = repository_ctx.os.name.lower()
    if repository_ctx.attr.nodejs_repository_names:
        target_tool = ""
        host_tool = ""
        target_repo_name = ""
        for repo_name in repository_ctx.attr.nodejs_repository_names:
            if repository_ctx.attr.os in repo_name:
                target_tool = "@%s//:node" % repo_name
                target_repo_name = repo_name
            if host_os in repo_name:
                host_tool = "@%s//:node" % repo_name
        
        if not target_tool or not host_tool:
            fail("No host_tool nor target_tool found")

        substitutions = {
            "%{NODE_TARGET_TOOL}": "%s" % target_tool,
            "%{NODE_TARGET_RUNFILES}": "@%s//:node_runfiles" % target_repo_name,
            "%{NODE_TARGET_ARGS}": "@%s//:bin/node_args.sh" % target_repo_name,
            "%{NODE_HOST_TOOL}": "%s" % host_tool,
            "%{OS}": "%s" % repository_ctx.attr.os,
            "%{ARCH}": "%s" % repository_ctx.attr.arch,
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
        "nodejs_repository_names": attr.string_list(
            mandatory = False,
        ),
    },
)

def _ensure_all_provided(func_name, attrs, kwargs):
    """
    For function func_name, ensure either all attributes in 'attrs' were
    specified in kwargs or none were specified.
    """
    any_specified = False
    for key in kwargs.keys():
        if key in attrs:
            any_specified = True
            break
    if not any_specified:
        return
    provided = []
    missing = []
    for attr in attrs:
        if attr in kwargs:
            provided.append(attr)
        else:
            missing.append(attr)
    if len(missing) != 0:
        fail("Attribute(s) {} are required for function {} because attribute(s) {} were specified.".format(
            ", ".join(missing),
            func_name,
            ", ".join(provided),
        ))

def node_configure(node_repositories):
    """
    Creates an external repository with a node_toolchain target
    properly configured.

    Args:
        **kwargs:
      Required Args
        name: A unique name for this rule.
      Default Args:
        local_node: Optional.
        local_path: Optional. Set to true to build kubectl from sources. Default: False.
                    Can't be specified if kubectl_path is specified.
        k8s_commit: Optional. Commit / release tag at which to build kubectl
          from. Default is defined as k8s_tag in :defaults.bzl.
        k8s_sha256: Optional. sha256 of commit at which to build kubectl from.
          Default is defined as k8s_sha256 in :defaults.bzl.
        kubectl_path: Optional. Use the kubectl binary at the given path or label.
        This can't be used with 'build_srcs'.
      Note: Not all versions/commits of kubernetes project can be used to compile
      kubectl from an external repo. Notably, we have only tested with v1.13.0-beta.1
      or above. Note this rule has a hardcoded pointer to io_kubernetes_build repo
      if your commit (above v1.13.0-beta.1) does not work due to problems,
      related to @io_kubernetes_build repo, please send a PR to update these values.
    """

    native.register_toolchains(
        "@build_bazel_rules_nodejs//toolchains/node:node_linux_toolchain",
        "@build_bazel_rules_nodejs//toolchains/node:node_osx_toolchain",
        "@build_bazel_rules_nodejs//toolchains/node:node_windows_toolchain",
    )

    if node_repositories:
        print("!!!!!!!!!InHERE!!!!!!!!!!!!")
        for os, arch in OS_ARCH_NAMES:
            _node_configure(name = "nodejs_config_%s_%s" % (os, arch), os=os, arch=arch, nodejs_repository_names=node_repositories)
    # _node_configure(name = name + "_osx", os="osx", arch="x86_64", host_tool="@nodejs_linux//:node", target_tool="@nodejs_darwin//:node")

    # build_srcs = False
    # if "build_srcs" in kwargs and "kubectl_path" in kwargs:
    #     fail("Attributes 'build_srcs' and 'kubectl_path' can't be specified at" +
    #          " the same time")
    # if "build_srcs" in kwargs and kwargs["build_srcs"]:
    #     build_srcs = True
    #     _ensure_all_provided(
    #         "kubectl_configure",
    #         ["k8s_commit", "k8s_sha256", "k8s_prefix"],
    #         kwargs,
    #     )
    #     k8s_commit = kwargs["k8s_commit"] if "k8s_commit" in kwargs else _k8s_commit
    #     k8s_sha256 = kwargs["k8s_sha256"] if "k8s_sha256" in kwargs else _k8s_sha256
    #     k8s_prefix = kwargs["k8s_prefix"] if "k8s_prefix" in kwargs else _k8s_prefix

    #     _ensure_all_provided(
    #         "kubectl_configure",
    #         ["k8s_repo_tools_sha", "k8s_repo_tools_commit", "k8s_repo_tools_prefix"],
    #         kwargs,
    #     )
    #     k8s_repo_tools_sha = kwargs["k8s_repo_tools_sha"] if "k8s_repo_tools_sha" in kwargs else _k8s_repo_tools_sha
    #     k8s_repo_tools_commit = kwargs["k8s_repo_tools_commit"] if "k8s_repo_tools_commit" in kwargs else _k8s_repo_tools_commit
    #     k8s_repo_tools_prefix = kwargs["k8s_repo_tools_prefix"] if "k8s_repo_tools_prefix" in kwargs else _k8s_repo_tools_prefix

    #     http_archive(
    #         name = "io_kubernetes",
    #         sha256 = k8s_sha256,
    #         strip_prefix = k8s_prefix,
    #         urls = [("https://github.com/{}/{}/archive/{}.tar.gz".format(
    #             _k8s_org,
    #             _k8s_repo,
    #             k8s_commit,
    #         ))],
    #     )
    #     http_archive(
    #         name = "io_kubernetes_build",
    #         sha256 = k8s_repo_tools_sha,
    #         strip_prefix = k8s_repo_tools_prefix,
    #         urls = ["https://github.com/{}/{}/archive/{}.tar.gz".format(
    #             _k8s_org,
    #             _k8s_repo_tools_repo,
    #             k8s_repo_tools_commit,
    #         )],
    #     )
    # if "kubectl_path" in kwargs:
    #     _kubectl_configure(name = name, kubectl_path = kwargs["kubectl_path"])
    # else:
    #     _kubectl_configure(name = name, build_srcs = build_srcs)
