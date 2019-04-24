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

"""Contains the node_module_library which is used by yarn_install & npm_install.
"""

load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleInfo", "NodeModuleSources")

def _trim_package_node_modules(package_name):
    # trim a package name down to its path prior to a node_modules
    # segment. 'foo/node_modules/bar' would become 'foo' and
    # 'node_modules/bar' would become ''
    segments = []
    for n in package_name.split("/"):
        if n == "node_modules":
            break
        segments += [n]
    return "/".join(segments)

def _node_module_library_impl(ctx):
    workspace = ctx.label.workspace_root.split("/")[1] if ctx.label.workspace_root else ctx.workspace_name
    package = _trim_package_node_modules(ctx.label.package)
    if package:
        workspace = "/".join([workspace, package])

    sources = depset(ctx.files.srcs, transitive = [dep.files for dep in ctx.attr.deps])

    scripts = depset()
    for src in ctx.attr.srcs:
        if NodeModuleSources in src:
            scripts = depset(transitive = [scripts, src[NodeModuleSources].scripts])
    scripts = depset(ctx.files.scripts, transitive = [scripts])

    return [
        DefaultInfo(
            files = sources,
        ),
        NodeModuleInfo(
            workspace = workspace,
        ),
        NodeModuleSources(
            sources = sources,
            scripts = scripts,
            workspace = workspace,
        ),
    ]

node_module_library = rule(
    implementation = _node_module_library_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "The list of files that comprise the package",
            allow_files = True,
        ),
        "scripts": attr.label_list(
            doc = "A subset of srcs that are javascript named-UMD or named-AMD scripts for use in rules such as ts_devserver",
            allow_files = True,
        ),
        "deps": attr.label_list(
            doc = "Transitive dependencies of the package",
        ),
    },
    doc = "Defines an npm package under node_modules",
)
