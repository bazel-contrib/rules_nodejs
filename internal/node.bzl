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
load(":common/module_mappings.bzl", "module_mappings_runtime_aspect")

def _sources_aspect_impl(target, ctx):
  result = depset()
  if hasattr(ctx.rule.attr, "deps"):
    for dep in ctx.rule.attr.deps:
      if hasattr(dep, "node_sources"):
        result += dep.node_sources
  # Note layering: until we have JS interop providers, this needs to know how to
  # get TypeScript outputs.
  if hasattr(target, "typescript"):
    result += target.typescript.es5_sources
  elif hasattr(target, "files"):
    result += target.files
  return struct(node_sources = result)

sources_aspect = aspect(
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
          "TEMPLATED_label_package": ctx.attr.node_modules.label.package,
          "TEMPLATED_workspace_name": ctx.workspace_name,
      },
      executable=True,
  )

def _nodejs_binary_impl(ctx):
    node = ctx.file._node
    node_modules = ctx.files.node_modules
    sources = depset()
    for d in ctx.attr.data:
      if hasattr(d, "node_sources"):
        sources += d.node_sources

    _write_loader_script(ctx)

    # Avoid writing non-normalized paths (workspace/../other_workspace/path)
    if ctx.outputs.loader.short_path.startswith("../"):
      script_path = ctx.outputs.loader.short_path[len("../"):]
    else:
      script_path = "/".join([
          ctx.workspace_name,
          ctx.outputs.loader.short_path,
      ])
    ctx.template_action(
        template=ctx.file._launcher_template,
        output=ctx.outputs.main,
        substitutions={
            "TEMPLATED_node": ctx.workspace_name + "/" + node.path,
            "TEMPLATED_args": "",
            "TEMPLATED_script_path": script_path,
        },
        executable=True,
    )

    runfiles = depset(sources)
    runfiles += [node]
    runfiles += [ctx.outputs.loader]
    runfiles += node_modules

    return struct(
        runfiles = ctx.runfiles(
            transitive_files = runfiles,
            files = [node, ctx.outputs.loader] + node_modules + sources.to_list(),
            collect_data = True,
        ),
    )

_NODEJS_EXECUTABLE_ATTRS = {
    "entry_point": attr.string(mandatory = True),
    "data": attr.label_list(
        allow_files = True,
        cfg = "data",
        aspects=[sources_aspect, module_mappings_runtime_aspect]),
    "_node": attr.label(
        default = Label("@nodejs//:node"),
        allow_files = True,
        single_file = True),
    "node_modules": attr.label(
        default = Label("@//:node_modules")),
    "_launcher_template": attr.label(
        default = Label("//internal:node_launcher.sh"),
        allow_files = True,
        single_file = True),
    "_loader_template": attr.label(
        default = Label("//internal:node_loader.js"),
        allow_files = True,
        single_file = True),
}

_NODEJS_EXECUTABLE_OUTPUTS = {
    "loader": "%{name}_loader.js",
    "main": "%{name}_launcher.sh"
}

nodejs_binary_rule = rule(
    implementation = _nodejs_binary_impl,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
)

def nodejs_binary(name, args=[], **kwargs):
    nodejs_binary_rule(
        name = "%s_loader" % name,
        **kwargs
    )

    native.sh_binary(
        name = name,
        args = args,
        srcs = [":%s_loader_launcher.sh" % name],
        data = [":%s_loader" % name],
    )

def nodejs_test(name, args=[], **kwargs):
    nodejs_binary_rule_test(
        name = "%s_loader" % name,
        **kwargs
    )

    native.sh_binary(
        name = name,
        args = args,
        srcs = [":%s_loader_launcher.sh" % name],
        data = [":%s_loader" % name],
    )
