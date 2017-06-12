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

"""Rules for executing programs in the nodejs runtime.
"""
load(":executables.bzl", "get_node")

def _sources_aspect_impl(target, ctx):
  result = set()
  if hasattr(ctx.rule.attr, "deps"):
    for dep in ctx.rule.attr.deps:
      if hasattr(dep, "node_sources"):
        result += dep.node_sources
  if hasattr(target, "typescript"):
    result += target.typescript.es5_sources
  return struct(node_sources = result)

_sources_aspect = aspect(
    _sources_aspect_impl,
    attr_aspects = ["deps"],
)

def _nodejs_binary_impl(ctx):
    node = ctx.file._node
    script = ctx.attr.main
    node_modules = ctx.files._node_modules
    sources = set()
    for d in ctx.attr.data:
      if hasattr(d, "node_sources"):
        sources += d.node_sources

    ctx.template_action(
        template=ctx.file._launcher_template,
        output=ctx.outputs.executable,
        substitutions={
            "TEMPLATED_node": ctx.workspace_name + "/" + node.path,
            "TEMPLATED_args": " ".join(ctx.attr.args),
            "TEMPLATED_script_path": script,
        },
        executable=True,
    )

    return struct(
        runfiles = ctx.runfiles(
            files = [node] + node_modules + sources.to_list(),
            collect_data = True,
        ),
    )

nodejs_binary = rule(
    _nodejs_binary_impl,
    attrs = {
        "main": attr.string(),
        "data": attr.label_list(
            allow_files = True,
            cfg = "data",
            aspects=[_sources_aspect]),
        "_node": attr.label(
            default = get_node(),
            allow_files = True,
            single_file = True),
        "_node_modules": attr.label(
            default = Label("@npm//installed:node_modules")),
        "_launcher_template": attr.label(
            default = Label("//internal:node_launcher.sh"),
            allow_files = True,
            single_file = True)
    },
    executable = True,
)
