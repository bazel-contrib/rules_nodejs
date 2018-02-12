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
load("//internal/common:module_mappings.bzl", "module_mappings_runtime_aspect")
load("//internal/common:sources_aspect.bzl", "sources_aspect")
load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")

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
          "TEMPLATED_bootstrap": "\n  " + ",\n  ".join(
              ["\"" + d + "\"" for d in ctx.attr.bootstrap]),
          "TEMPLATED_entry_point": ctx.attr.entry_point,
          "TEMPLATED_label_package": ctx.attr.node_modules.label.package,
          # There are two workspaces in general:
          # A) The user's workspace is the one where the bazel command is run
          # B) The label's workspace contains the target being built/run
          #
          # If A has an npm dependency on B, then we'll look in the node_modules
          # to find B's dependency D. It could be in two different places
          # depending on hoisting [1]:
          # A/node_modules/B/node_modules/D
          # A/node_modules/D
          # That means we must resolve runfiles relative to A.
          #
          # However if A has a bazel dependency on B, then B is not under A's
          # node_modules directory.
          # A
          # B/node_modules/D
          # That means we must resolve runfiles relative to B.
          #
          # Since Bazel does not tell us whether the label's workspace was
          # created with `local_repository(path="node_modules/blah")` we can't
          # distinguish the two cases. Therefore we add both workspaces to the
          # resolution search paths.
          #
          # [1] https://yarnpkg.com/lang/en/docs/workspaces/#toc-limitations-caveats
          "TEMPLATED_user_workspace_name": ctx.workspace_name,
          "TEMPLATED_label_workspace_name": (
              ctx.attr.node_modules.label.workspace_root.split("/")[1]
              if ctx.attr.node_modules.label.workspace_root
              # If the label is in the same workspace as the user, we don't
              # need another search location.
              else ""
          ),
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
    env_vars = "export BAZEL_TARGET=%s\n" % ctx.label
    for k in ctx.var.keys():
      env_vars += "export %s=\"%s\"\n" % (k, ctx.var[k])

    substitutions = {
        "TEMPLATED_node": ctx.workspace_name + "/" + node.path,
        "TEMPLATED_args": " ".join([
            expand_location_into_runfiles(ctx, a)
            for a in ctx.attr.templated_args]),
        "TEMPLATED_script_path": script_path,
        "TEMPLATED_env_vars": env_vars,
    }
    # Write the output twice.
    # In order to have the name "nodejs_test", the rule must be declared
    # with test = True, which means we must write an output called "executable".
    # However, in order to wrap with a sh_test for Windows, we must be able to
    # get a single output file with a ".sh" extension.
    ctx.template_action(
        template=ctx.file._launcher_template,
        output=ctx.outputs.executable,
        substitutions=substitutions,
        executable=True,
    )
    ctx.template_action(
        template=ctx.file._launcher_template,
        output=ctx.outputs.script,
        substitutions=substitutions,
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
    "bootstrap": attr.string_list(default = []),
    "data": attr.label_list(
        allow_files = True,
        cfg = "data",
        aspects=[sources_aspect, module_mappings_runtime_aspect]),
    "templated_args": attr.string_list(),
    "_node": attr.label(
        default = Label("@nodejs//:node"),
        allow_files = True,
        single_file = True),
    "node_modules": attr.label(
        # By default, binaries use the node_modules in the workspace
        # where the bazel command is run. This assumes that any needed
        # dependencies are installed there, commonly due to a transitive
        # dependency on a package like @bazel/typescript.
        # See discussion: https://github.com/bazelbuild/rules_typescript/issues/13
        default = Label("@//:node_modules")),
    "_launcher_template": attr.label(
        default = Label("//internal/node:node_launcher.sh"),
        allow_files = True,
        single_file = True),
    "_loader_template": attr.label(
        default = Label("//internal/node:node_loader.js"),
        allow_files = True,
        single_file = True),
}

_NODEJS_EXECUTABLE_OUTPUTS = {
    "loader": "%{name}_loader.js",
    "script": "%{name}.sh",
}

# The name of the declared rule appears in
# bazel query --output=label_kind
# So we make these match what the user types in their BUILD file
# and duplicate the definitions to give two distinct symbols.
nodejs_binary = rule(
    implementation = _nodejs_binary_impl,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
    executable = True,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
)
nodejs_test = rule(
    implementation = _nodejs_binary_impl,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
    test = True,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
)

# Wrap in an sh_binary for windows .exe wrapper.
def nodejs_binary_macro(name, args=[], visibility=None, tags=[], **kwargs):
  nodejs_binary(
      name = "%s_bin" % name,
      **kwargs
  )

  native.sh_binary(
      name = name,
      args = args,
      tags = tags,
      srcs = [":%s_bin.sh" % name],
      data = [":%s_bin" % name],
      visibility = visibility,
  )

# Wrap in an sh_test for windows .exe wrapper.
def nodejs_test_macro(name, args=[], visibility=None, tags=[], **kwargs):
  nodejs_test(
      name = "%s_bin" % name,
      testonly = 1,
      **kwargs
  )

  native.sh_test(
      name = name,
      args = args,
      tags = tags,
      visibility = visibility,
      srcs = [":%s_bin.sh" % name],
      data = [":%s_bin" % name],
  )
