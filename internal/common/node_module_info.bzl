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

"""NodeModuleInfo & NodeModuleSources providers and apsect to collect node_modules from deps.
"""

NodeModuleInfo = provider(
    doc = "Provides information about npm dependencies installed with yarn_install and npm_install rules",
    fields = {
        "workspace": "The workspace name that the npm dependencies are provided from",
    },
)

NodeModuleSources = provider(
    doc = "Provides sources for npm dependencies installed with yarn_install and npm_install rules",
    fields = {
        "sources": "Source files that are npm dependencies",
        "workspace": "The workspace name that the npm dependencies are provided from",
    },
)

def _collect_node_modules_aspect_impl(target, ctx):
    nm_wksp = None

    if NodeModuleSources in target:
        return []

    if hasattr(ctx.rule.attr, "deps"):
        sources = depset()
        for dep in ctx.rule.attr.deps:
            if NodeModuleSources in dep:
                if nm_wksp and dep[NodeModuleSources].workspace != nm_wksp:
                    fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (nm_wksp, dep[NodeModuleSources].workspace))
                nm_wksp = dep[NodeModuleSources].workspace
                sources = depset(transitive = [dep[NodeModuleSources].sources, sources])
        if sources:
            return [NodeModuleSources(sources = sources, workspace = nm_wksp)]

    return []

collect_node_modules_aspect = aspect(
    implementation = _collect_node_modules_aspect_impl,
    attr_aspects = ["deps"],
)
