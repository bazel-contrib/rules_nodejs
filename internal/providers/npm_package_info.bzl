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

"""NpmPackageInfo providers and apsect to collect node_modules from deps.
"""

# NpmPackageInfo provider is provided by targets that are npm dependencies by the
# `js_library` rule as well as other targets that have direct or transitive deps on
# `js_library` targets via the `node_modules_aspect` below.
NpmPackageInfo = provider(
    doc = "Provides information about npm dependencies",
    fields = {
        "direct_sources": "Depset of direct source files in this npm package",
        "sources": "Depset of direct & transitive source files in this npm package and in its dependencies",
        "workspace": "The workspace name that this npm package is provided from",
    },
)

def _node_modules_aspect_impl(target, ctx):
    providers = []

    # provide NpmPackageInfo if it is not already provided there are NpmPackageInfo deps
    if not NpmPackageInfo in target:
        sources_depsets = []
        workspace = None
        if hasattr(ctx.rule.attr, "deps"):
            for dep in ctx.rule.attr.deps:
                if NpmPackageInfo in dep:
                    if workspace and dep[NpmPackageInfo].workspace != workspace:
                        fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (workspace, dep[NpmPackageInfo].workspace))
                    workspace = dep[NpmPackageInfo].workspace
                    sources_depsets.append(dep[NpmPackageInfo].sources)
            if workspace:
                providers.extend([NpmPackageInfo(direct_sources = depset(), sources = depset(transitive = sources_depsets), workspace = workspace)])

    return providers

node_modules_aspect = aspect(
    _node_modules_aspect_impl,
    attr_aspects = ["deps"],
)
