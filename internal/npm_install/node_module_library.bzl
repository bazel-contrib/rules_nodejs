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

load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleInfo", "NodeModuleSources")
load("@build_bazel_rules_nodejs//internal/common:providers.bzl", "ScriptsProvider")

def _node_module_library_impl(ctx):
    apf_umds = []
    apf_factories = []
    apf_summaries = []

    # If this npm package is in the Angular package format then collect
    # umd bundles, ngfactory files & ngsummary files and provide them
    # via the ScriptsProvider
    if ctx.attr.is_apf:
        for file in ctx.files.srcs:
            if file.basename.endswith(".umd.js"):
                apf_umds.append(file)
            elif file.basename.endswith(".ngfactory.js"):
                apf_factories.append(file)
            elif file.basename.endswith(".ngsummary.js"):
                apf_summaries.append(file)

    sources = depset(transitive = [src.files for src in ctx.attr.srcs] + [dep.files for dep in ctx.attr.deps])
    workspace = ctx.label.workspace_root.split("/")[1] if ctx.label.workspace_root else ctx.workspace_name

    return [
        DefaultInfo(
            files = sources,
        ),
        NodeModuleInfo(
            workspace = workspace,
        ),
        NodeModuleSources(
            sources = sources,
            workspace = workspace,
        ),
        ScriptsProvider(
            scripts = depset(apf_umds + apf_factories + apf_summaries),
        ),
    ]

node_module_library = rule(
    implementation = _node_module_library_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "The list of files that comprise the package",
            allow_files = True,
        ),
        "is_apf": attr.bool(
            default = False,
            doc = "True if this npm package is in the Angular package format",
        ),
        "deps": attr.label_list(
            doc = "Transitive dependencies of the package",
        ),
    },
    doc = "Defines an npm package under node_modules",
)
