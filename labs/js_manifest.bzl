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
"""A docstring"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSModuleInfo")

_ATTRS = {
    "srcs": attr.label_list(
        default = [],
        allow_files = True,
    ),
    "extensions": attr.string_list(
        default = ["js", "mjs"],
    ),
    "separator": attr.string(
        default = "\n",
    ),
}

def _impl(ctx):
    sources = []
    for d in ctx.attr.srcs:
        # If dep has a JSModuleInfo provider than take the direct_sources as the test files
        # otherwise use DefaultInfo files.
        if JSModuleInfo in d:
            srcs = d[JSModuleInfo].direct_sources.to_list()
        else:
            srcs = d[DefaultInfo].files
        for src in srcs:
            if src.extension in ctx.attr.extensions:
                sources.append(src)

    ctx.actions.write(
        ctx.outputs.manifest,
        ctx.attr.separator.join([f.short_path for f in sources]),
    )

    return [DefaultInfo(files = depset([ctx.outputs.manifest]))]

js_manifest = rule(
    implementation = _impl,
    attrs = _ATTRS,
    outputs = {
        "manifest": "%{name}.manifest",
    },
)
