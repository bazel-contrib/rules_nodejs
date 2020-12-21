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

"""ExternalNpmPackageInfo providers and apsect to collect node_modules from deps.
"""

# ExternalNpmPackageInfo provider is provided by targets that are external npm packages by
# `js_library` rule when external_npm_package is set to True, as well as other targets that
# have direct or transitive deps on `js_library` targets via the `node_modules_aspect` below.
ExternalNpmPackageInfo = provider(
    doc = "Provides information about one or more external npm packages",
    fields = {
        "direct_sources": "Depset of direct source files in these external npm package(s)",
        "sources": "Depset of direct & transitive source files in these external npm package(s) and transitive dependencies",
        "workspace": "The workspace name that these external npm package(s) are provided from",
    },
)

def _node_modules_aspect_impl(target, ctx):
    providers = []

    # provide ExternalNpmPackageInfo if it is not already provided there are ExternalNpmPackageInfo deps
    if not ExternalNpmPackageInfo in target:
        sources_depsets = []
        workspace = None
        if hasattr(ctx.rule.attr, "deps"):
            for dep in ctx.rule.attr.deps:
                if ExternalNpmPackageInfo in dep:
                    if workspace and dep[ExternalNpmPackageInfo].workspace != workspace:
                        fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (workspace, dep[ExternalNpmPackageInfo].workspace))
                    workspace = dep[ExternalNpmPackageInfo].workspace
                    sources_depsets.append(dep[ExternalNpmPackageInfo].sources)
            if workspace:
                providers.extend([ExternalNpmPackageInfo(direct_sources = depset(), sources = depset(transitive = sources_depsets), workspace = workspace)])

    return providers

node_modules_aspect = aspect(
    _node_modules_aspect_impl,
    attr_aspects = ["deps"],
)
