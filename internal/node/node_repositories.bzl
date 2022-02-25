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

"""Install NodeJS & Yarn

This is a set of repository rules for setting up hermetic copies of NodeJS and Yarn.
See https://docs.bazel.build/versions/main/skylark/repository_rules.html
"""

load("//internal/common:check_bazel_version.bzl", "check_bazel_version")
load("//nodejs/private:nodejs_repo_host_os_alias.bzl", "nodejs_repo_host_os_alias")
load("//nodejs/private:os_name.bzl", "OS_ARCH_NAMES", "node_exists_for_os", "os_name")
load("//nodejs:repositories.bzl", "DEFAULT_NODE_VERSION", node_repositories_rule = "node_repositories")
load("//toolchains/node:node_toolchain_configure.bzl", "node_toolchain_configure")

def node_repositories(**kwargs):
    """
    Wrapper macro around node_repositories_rule to call it for each platform.

    Also register bazel toolchains, and make other convenience repositories.

    Args:
      **kwargs: the documentation is generated from the node_repositories_rule, not this macro.
    """

    # Require that users update Bazel, so that we don't need to support older ones.
    check_bazel_version(
        message = """
    Bazel current LTS version (4.0.0) is the minimum required to use rules_nodejs.
    """,
        minimum_bazel_version = "4.0.0",
    )

    # Cheap check to see if we have already set up the node_repositories when being called via the
    # npm_install or yarn_install macros that call this first
    if "nodejs" in native.existing_rules().keys():
        return

    # This needs to be setup so toolchains can access nodejs for all different versions
    node_version = kwargs.get("node_version", DEFAULT_NODE_VERSION)
    node_repositories = kwargs.get("node_repositories", None)

    for os_arch_name in OS_ARCH_NAMES:
        os_name = "_".join(os_arch_name)

        # If we couldn't download node, don't make an external repo for it either
        if not node_exists_for_os(node_version, os_name, node_repositories):
            continue
        node_repository_name = "nodejs_%s" % os_name
        _maybe(
            node_repositories_rule,
            name = node_repository_name,
            **kwargs
        )
        target_tool = "@%s//:node_bin" % node_repository_name
        native.register_toolchains("@build_bazel_rules_nodejs//toolchains/node:node_%s_toolchain" % os_name)
        node_toolchain_configure(
            name = "%s_config" % node_repository_name,
            target_tool = target_tool,
        )

    # This "nodejs" repo is just for convenience so one does not have to target @nodejs_<os_name>//...
    # All it does is create aliases to the @nodejs_<host_os>_<host_arch> repository
    _maybe(
        nodejs_repo_host_os_alias,
        name = "nodejs",
        node_version = node_version,
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
