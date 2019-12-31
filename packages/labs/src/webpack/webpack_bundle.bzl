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

"""Contains the webpack_bundle rule

This rule is experimental, as part of Angular Labs! There may be breaking changes.
"""

WEBPACK_BUNDLE_ATTRS = {
    "srcs": attr.label_list(allow_files = True),
    "entry_point": attr.label(allow_single_file = True, mandatory = True),
    "webpack": attr.label(default = "@npm//@bazel/labs/bin:webpack", executable = True, cfg = "host"),
}
WEBPACK_BUNDLE_OUTS = {
    "bundle": "%{name}.js",
    "sourcemap": "%{name}.map",
}

def _webpack_bundle(ctx):
    args = ctx.actions.args()
    args.use_param_file("%s", use_always = True)
    args.add(ctx.outputs.bundle.path)
    args.add(ctx.outputs.sourcemap.path)
    args.add(ctx.file.entry_point.path)
    ctx.actions.run(
        inputs = ctx.files.srcs,
        executable = ctx.executable.webpack,
        outputs = [ctx.outputs.bundle, ctx.outputs.sourcemap],
        arguments = [args],
        progress_message = "Bundling JavaScript %s [webpack]" % ctx.outputs.bundle.path,
        env = {"COMPILATION_MODE": ctx.var["COMPILATION_MODE"]},
    )
    return [DefaultInfo()]

webpack_bundle = rule(
    implementation = _webpack_bundle,
    attrs = WEBPACK_BUNDLE_ATTRS,
    outputs = WEBPACK_BUNDLE_OUTS,
)
