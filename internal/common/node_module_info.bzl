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

"""NodeModuleInfo provider and apsect to collect node_modules from deps.
"""

NodeModuleInfo = provider(
    doc = "This provider contains information about npm dependencies installed with yarn_install and npm_install rules",
    fields = {
        "workspace": "The workspace name that the npm dependencies are provided from",
    },
)

NodeModuleSources = provider(
    doc = "This provider contains all the transtive npm dependency sources of a non-npm dependency.",
    fields = {
        "srcs": "List of source files that are npm dependencies",
    },
)

def _collect_node_modules_aspect_impl(target, ctx):
    nm_wksp = None

    if hasattr(ctx.rule.attr, "tags") and "NODE_MODULE_MARKER" in ctx.rule.attr.tags:
        nm_wksp = target.label.workspace_root.split("/")[1] if target.label.workspace_root else ctx.workspace_name
        return [NodeModuleInfo(workspace = nm_wksp)]

    info = []
    srcs = depset()
    if hasattr(ctx.rule.attr, "deps"):
        for dep in ctx.rule.attr.deps:
            if NodeModuleInfo in dep and NodeModuleSources in dep:
                fail("Dependency %s has both NodeModuleInfo and NodeModuleSources provider. It can only have one or the other." % dep)
            if NodeModuleInfo in dep:
                if nm_wksp and dep[NodeModuleInfo].workspace != nm_wksp:
                    fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (nm_wksp, dep[NodeModuleInfo].workspace))
                srcs = depset(transitive = [dep.files, srcs])
            if NodeModuleSources in dep:
                srcs = depset(transitive = [dep[NodeModuleSources].srcs, srcs])

    if srcs:
        return [NodeModuleSources(srcs = srcs)]

    return []

collect_node_modules_aspect = aspect(
    implementation = _collect_node_modules_aspect_impl,
    attr_aspects = ["deps"],
)
