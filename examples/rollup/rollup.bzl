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

This is not a full-featured Rollup bazel rule, just enough to test the
other rules in this repo.
"""

def _rollup(ctx):
  args = ["--input", ctx.attr.entry_point]
  args += ["--output.file", ctx.outputs.bundle.path]
  args += ["--output.format", "es"]

  ctx.actions.run(
      inputs = ctx.files.srcs,
      executable = ctx.executable.rollup,
      outputs = [ctx.outputs.bundle],
      arguments = args,
  )
  return [DefaultInfo()]

rollup = rule(
    implementation = _rollup,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "entry_point": attr.string(mandatory = True),
        "rollup": attr.label(
            default = Label("//examples/rollup"),
            executable = True,
            cfg = "host"),
    },
    outputs = {
        "bundle": "%{name}.js"
    },
)