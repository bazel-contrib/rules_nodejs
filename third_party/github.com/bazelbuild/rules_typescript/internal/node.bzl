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
load(":common/module_mappings.bzl", "module_mappings_runtime_aspect")

def _sources_aspect_impl(target, ctx):
  result = depset()
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

def _write_loader_script(ctx):
  # Generates the JavaScript snippet of module roots mappings, with each entry
  # in the form:
  #   {module_name: /^mod_name\b/, module_root: 'path/to/mod_name'}
  module_mappings = []
  for d in ctx.attr.data:
    if hasattr(d, "runfiles_module_mappings"):
      for [mn, mr] in d.runfiles_module_mappings.items():
        escaped = mn.replace("/", r"\/").replace(".", r"\.")
        mapping = r"{module_name: /^%s\b/, module_root: '%s'}" % (escaped, mr)
        module_mappings.append(mapping)
  ctx.template_action(
      template=ctx.file._loader_template,
      output=ctx.outputs.loader,
      substitutions={
          "TEMPLATED_module_roots": "\n  " + ",\n  ".join(module_mappings),
          "TEMPLATED_entry_point": ctx.attr.entry_point,
          "TEMPLATED_workspace_name": ctx.workspace_name,
      },
      executable=True,
  )

def _nodejs_binary_impl(ctx):
    node = ctx.file._node
    node_modules = ctx.files._node_modules
    sources = depset()
    for d in ctx.attr.data:
      if hasattr(d, "node_sources"):
        sources += d.node_sources

    _write_loader_script(ctx)

    ctx.template_action(
        template=ctx.file._launcher_template,
        output=ctx.outputs.executable,
        substitutions={
            "TEMPLATED_node": ctx.workspace_name + "/" + node.path,
            "TEMPLATED_args": " ".join(ctx.attr.args),
            "TEMPLATED_script_path": "/".join([
                ctx.workspace_name,
                ctx.outputs.loader.short_path,
            ]),
        },
        executable=True,
    )

    return struct(
        runfiles = ctx.runfiles(
            files = [node, ctx.outputs.loader] + node_modules + sources.to_list(),
            collect_data = True,
        ),
    )

nodejs_binary = rule(
    _nodejs_binary_impl,
    attrs = {
        "entry_point": attr.string(),
        "data": attr.label_list(
            allow_files = True,
            cfg = "data",
            aspects=[_sources_aspect, module_mappings_runtime_aspect]),
        "_node": attr.label(
            default = get_node(),
            allow_files = True,
            single_file = True),
        "_node_modules": attr.label(
            default = Label("@//:node_modules")),
        "_launcher_template": attr.label(
            default = Label("//internal:node_launcher.sh"),
            allow_files = True,
            single_file = True),
        "_loader_template": attr.label(
            default = Label("//internal:node_loader.js"),
            allow_files = True,
            single_file = True),
    },
    executable = True,
    outputs = {
        "loader": "%{name}_loader.js"
    },
)
