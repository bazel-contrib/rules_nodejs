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

"""NodeModuleInfo & NodeModuleSourcesInfo providers and apsect to collect node_modules from deps.
"""

# NodeModuleInfo provider is only provided by targets that are npm dependencies by the
# `node_module_library` rule. This provider is currently used by different rules to filter out
# npm dependencies such as
# ```
# [d for d in ctx.attr.deps if not NodeModuleInfo in d]
# ```
# in `packages/typescript/internal/build_defs.bzl` or
# ```
# hasattr(target, "files") and not NodeModuleInfo in target:
# ```
# in `internal/common/sources_aspect.bzl`.
# Similar filtering is done in downstream repositories such as angular/angular so this provider
# needs to go through a deprecation period before it can be phased out.
NodeModuleInfo = provider(
    doc = "Provides information about npm dependencies installed with yarn_install and npm_install rules",
    fields = {
        "workspace": "The workspace name that the npm dependencies are provided from",
    },
)

# NodeModuleSourcesInfo provider is provided by targets that are npm dependencies by the
# `node_module_library` rule as well as other targets that have direct or transitive deps on
# `node_module_library` targets via the `collect_node_modules_aspect` below.
# TODO: rename to NodeModuleSourcesInfo so name doesn't trigger name-conventions warning
NodeModuleSourcesInfo = provider(
    doc = "Provides sources for npm dependencies installed with yarn_install and npm_install rules",
    fields = {
        "scripts": "Source files that are javascript named-UMD or named-AMD modules for use in rules such as ts_devserver",
        "sources": "Source files that are npm dependencies",
        "workspace": "The workspace name that the npm dependencies are provided from",
    },
)

def _collect_node_modules_aspect_impl(target, ctx):
    nm_wksp = None

    if NodeModuleSourcesInfo in target:
        return []

    if hasattr(ctx.rule.attr, "deps"):
        sources = depset()
        for dep in ctx.rule.attr.deps:
            if NodeModuleSourcesInfo in dep:
                if nm_wksp and dep[NodeModuleSourcesInfo].workspace != nm_wksp:
                    fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (nm_wksp, dep[NodeModuleSourcesInfo].workspace))
                nm_wksp = dep[NodeModuleSourcesInfo].workspace
                sources = depset(transitive = [dep[NodeModuleSourcesInfo].sources, sources])
        if sources:
            return [NodeModuleSourcesInfo(sources = sources, workspace = nm_wksp)]

    return []

collect_node_modules_aspect = aspect(
    implementation = _collect_node_modules_aspect_impl,
    attr_aspects = ["deps"],
)
