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

"""Aspect to collect es5 js sources and scripts from deps.
"""

load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleInfo", "NodeModuleSourcesInfo")

def _sources_aspect_impl(target, ctx):
    # TODO(kyliau): node_sources here is a misnomer because it implies that
    # the sources have got something to do with node modules. In fact,
    # node_sources collects es5 output from typescript and "javascript-like"
    # targets that are *not* node modules. This name is kept as-is to maintain
    # compatibility with existing rules but should be renamed and cleaned up.
    node_sources = depset()

    # dev_scripts is a collection of "scripts" from "node-module-like" targets
    # such as `node_module_library`
    dev_scripts = depset()

    # Note layering: until we have JS interop providers, this needs to know how to
    # get TypeScript outputs.
    if hasattr(target, "typescript"):
        node_sources = depset(transitive = [node_sources, target.typescript.es5_sources])
    elif NodeModuleSourcesInfo in target:
        dev_scripts = depset(transitive = [dev_scripts, target[NodeModuleSourcesInfo].scripts])
    elif hasattr(target, "files") and not NodeModuleInfo in target:
        # Sources from npm fine grained deps should not be included
        node_sources = depset(
            [f for f in target.files if f.path.endswith(".js")],
            transitive = [node_sources],
        )

    if hasattr(ctx.rule.attr, "deps"):
        for dep in ctx.rule.attr.deps:
            if hasattr(dep, "node_sources"):
                node_sources = depset(transitive = [node_sources, dep.node_sources])
            if hasattr(dep, "dev_scripts"):
                dev_scripts = depset(transitive = [dev_scripts, dep.dev_scripts])

    return struct(
        node_sources = node_sources,
        dev_scripts = dev_scripts,
    )

sources_aspect = aspect(
    _sources_aspect_impl,
    attr_aspects = ["deps"],
)
