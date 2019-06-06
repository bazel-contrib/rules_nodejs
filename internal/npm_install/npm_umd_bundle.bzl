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

"""Node package UMD bundling

For use by yarn_install and npm_install. Not meant to be part of the public API.
"""

load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleSources", "collect_node_modules_aspect")

def _npm_umd_bundle(ctx):
    if len(ctx.attr.entry_point.files.to_list()) != 1:
        fail("labels in entry_point must contain exactly one file")

    output = ctx.actions.declare_file("%s.umd.js" % ctx.attr.package_name)

    args = ctx.actions.args()

    args.add(ctx.workspace_name)
    args.add(ctx.attr.package_name)
    args.add(ctx.file.entry_point.path)
    args.add(output.path)

    sources = ctx.attr.package[NodeModuleSources].sources.to_list()

    # Only pass .js files as inputs to browserify
    inputs = [f for f in sources if f.path.endswith(".js")]

    ctx.actions.run(
        progress_message = "Generated UMD bundle for %s npm package [browserify]" % ctx.attr.package_name,
        executable = ctx.executable._browserify_wrapped,
        inputs = inputs,
        outputs = [output],
        arguments = [args],
    )

    return [
        DefaultInfo(files = depset([output]), runfiles = ctx.runfiles([output])),
        OutputGroupInfo(umd = depset([output])),
    ]

NPM_UMD_ATTRS = {
    "package_name": attr.string(
        doc = """The name of the npm package""",
        mandatory = True,
    ),
    "entry_point": attr.label(
        doc = """Entry point for the npm package""",
        mandatory = True,
        allow_single_file = True,
    ),
    "package": attr.label(
        doc = """The npm package target""",
        mandatory = True,
        aspects = [collect_node_modules_aspect],
    ),
    "_browserify_wrapped": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@build_bazel_rules_nodejs//internal/npm_install:browserify-wrapped"),
    ),
}

npm_umd_bundle = rule(
    implementation = _npm_umd_bundle,
    attrs = NPM_UMD_ATTRS,
    outputs = {"umd": "%{package_name}.umd.js"},
)
"""Node package umd bundling
"""
# TODO(gregolan): add the above docstring to `doc` attribute
# once we upgrade to stardoc. Skydoc crashes with
# ```
# File "internal/npm_package/npm_package.bzl", line 221, in <module>
#     outputs = NPM_PACKAGE_OUTPUTS,
# TypeError: rule() got an unexpected keyword argument 'doc'
# ```
# when it encounters a `doc` attribute in a rule.
