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

"""Example rollup rule

This is not a full-featured Parcel bazel rule, just enough to demonstrate how to write one.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "run_node")

def _parcel_impl(ctx):
    """The "implementation function" for our rule.

    It starts with underscore, which means this function is private to this file.

    Args:
      ctx: Bazel's starlark execution context
    """

    # Options documented at https://parceljs.org/cli.html
    args = ["build", ctx.file.entry_point.short_path]
    args += ["--out-dir", ctx.outputs.bundle.dirname]
    args += ["--out-file", ctx.outputs.bundle.basename]

    # We use the run_node helper rather than ctx.actions.run so that the npm package
    # gets automatically included in the action inputs
    run_node(
        ctx = ctx,
        inputs = ctx.files.srcs + [ctx.file.entry_point],
        executable = "parcel",
        outputs = [ctx.outputs.bundle, ctx.outputs.sourcemap],
        arguments = args,
        env = {"COMPILATION_MODE": ctx.var["COMPILATION_MODE"]},
        progress_message = "Bundling JavaScript %s [parcel]" % ctx.outputs.bundle.short_path,
    )
    return [DefaultInfo()]

parcel = rule(
    implementation = _parcel_impl,
    attrs = {
        "entry_point": attr.label(
            allow_single_file = True,
            mandatory = True,
        ),
        "parcel": attr.label(
            # This default assumes that users name their install "npm"
            default = Label("@npm//parcel-bundler/bin:parcel"),
            executable = True,
            cfg = "exec",
        ),
        "srcs": attr.label_list(allow_files = True),
    },
    outputs = {
        "bundle": "%{name}.js",
        "sourcemap": "%{name}.js.map",
    },
)
