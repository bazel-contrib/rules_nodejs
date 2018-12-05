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

# Definitions for handling path re-mapping, to support short module names.
# See pathMapping doc: https://github.com/Microsoft/TypeScript/issues/5039
#
# This reads the module_root and module_name attributes from typescript rules in
# the transitive closure, rolling these up to provide a mapping to the
# TypeScript compiler and to editors.
#

"""NodeModuleInfo provider and apsect to collect node_modules from deps.
"""

NodeModuleInfo = provider(
    doc = "This provider contains information about npm dependencies installed with yarn_install and npm_install rules",
    fields = {
        "workspace": "The workspace name that the npm dependencies are provided from",
    },
)

def _collect_node_modules_aspect_impl(target, ctx):
    nm_wksp = None

    if hasattr(ctx.rule.attr, "tags") and "NODE_MODULE_MARKER" in ctx.rule.attr.tags:
        nm_wksp = target.label.workspace_root.split("/")[1] if target.label.workspace_root else ctx.workspace_name
        return [NodeModuleInfo(workspace = nm_wksp)]

    return []

collect_node_modules_aspect = aspect(
    implementation = _collect_node_modules_aspect_impl,
    attr_aspects = ["deps"],
)
