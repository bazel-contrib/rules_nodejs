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
load("//:internal/collect_es6_sources.bzl", "collect_es6_sources")


def _rollup(ctx):
  """This is not a full-featured Rollup bazel rule, just enough to test the
     other rules in this repo.
  """
  inputs = collect_es6_sources(ctx)

  entry_point = None
  for i in inputs:
    if ctx.attr.entry_point in i.path:
        entry_point = i.path
        break

  workspace_name = ctx.label.workspace_root.replace("external/", "")
  if workspace_name == "":
      workspace_name = ctx.workspace_name
  if entry_point == None or workspace_name not in entry_point:
    fail("Entry points should be the path to your entry module, prefixed with your workspace directory.\n" +
        "Ex. entry_point = \"%s/path/to/entry/point/module\" " % (ctx.workspace_name))

  args = ["--input", entry_point]
  args += ["--output.file", ctx.outputs.bundle.path]
  args += ["--output.format", "es"]

  ctx.action(
      inputs = inputs,
      executable = ctx.executable.rollup,
      outputs = [ctx.outputs.bundle],
      arguments = args,
  )
  return struct()

rollup = rule(
    implementation = _rollup,
    attrs = {
        "srcs": attr.label_list(allow_files = ['js']),
        "deps": attr.label_list(),
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
