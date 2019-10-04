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

"""Rule to get devmode js sources from deps.

Outputs a manifest file with the sources listed.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSNamedModuleInfo")

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _devmode_js_sources_impl(ctx):
    sources_depsets = []
    for dep in ctx.attr.deps:
        if JSNamedModuleInfo in dep:
            sources_depsets.append(dep[JSNamedModuleInfo].sources)
        if hasattr(dep, "files"):
            sources_depsets.append(dep.files)
    sources = depset(transitive = sources_depsets)

    ctx.actions.write(ctx.outputs.manifest, "".join([
        _to_manifest_path(ctx, f) + "\n"
        for f in sources.to_list()
        if f.path.endswith(".js") or f.path.endswith(".mjs")
    ]))

    return [DefaultInfo(files = sources)]

devmode_js_sources = rule(
    implementation = _devmode_js_sources_impl,
    attrs = {
        "deps": attr.label_list(
            allow_files = True,
        ),
    },
    outputs = {
        "manifest": "%{name}.MF",
    },
)
