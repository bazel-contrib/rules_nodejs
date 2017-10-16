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

def _local(ctx):
  args = ["--hello", ctx.attr.hello]
  args += ["--output", ctx.outputs.text.path]
  ctx.action(
      executable = ctx.executable.binary,
      outputs = [ctx.outputs.text],
      arguments = args,
  )
  return struct()

run_local = rule(
    implementation = _local,
    attrs = {
        "hello": attr.string(default = "world"),
        "binary": attr.label(
            default = Label("//examples/local"),
            executable = True,
            cfg = "host"),
    },
    outputs = {
        "text": "%{name}.txt"
    },
)
