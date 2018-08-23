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

"""Executing programs

These rules run the node binary with the given sources.

They support module mapping: any targets in the transitive dependencies with
a `module_name` attribute can be `require`d by that name.
"""
load("//internal/common:module_mappings.bzl", "module_mappings_runtime_aspect")
load("//internal/common:sources_aspect.bzl", "sources_aspect")
load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")

NodeModule = provider(doc = "FIXME")

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
  node_modules_root = None
  if ctx.attr.node_modules:
    workspace = ctx.attr.node_modules.label.workspace_root.split("/")[1] if ctx.attr.node_modules.label.workspace_root else ctx.workspace_name
    node_modules_root = "/".join([f for f in [
        workspace,
        ctx.attr.node_modules.label.package,
        "node_modules"] if f])
  for d in ctx.attr.data:
    if NodeModule in d:
      possible_root = "/".join([d[NodeModule].workspace, "node_modules"])
      if not node_modules_root:
        node_modules_root = possible_root
      elif node_modules_root != possible_root:
        fail("All node_modules need to come from a single workspace. found", [node_modules_root, possible_root])
  if not node_modules_root:
    fail("""
         Due to a breaking change in rules_nodejs, target %s
         must now declare either an explicit node_modules attribute, or
         list explicit deps[] or data[] dependencies on npm labels.

         See http://FIXME""" % ctx.label)
  ctx.actions.expand_template(
      template=ctx.file._loader_template,
      output=ctx.outputs.loader,
      substitutions={
          "TEMPLATED_target": str(ctx.label),
          "TEMPLATED_module_roots": "\n  " + ",\n  ".join(module_mappings),
          "TEMPLATED_bootstrap": "\n  " + ",\n  ".join(
              ["\"" + d + "\"" for d in ctx.attr.bootstrap]),
          "TEMPLATED_entry_point": ctx.attr.entry_point,
          "TEMPLATED_user_workspace_name": ctx.workspace_name,
          "TEMPLATED_node_modules_root": node_modules_root,
          "TEMPLATED_install_source_map_support": str(ctx.attr.install_source_map_support).lower(),
      },
      is_executable=True,
  )

def _nodejs_binary_impl(ctx):
    node = ctx.file.node
    node_modules = ctx.files.node_modules
    sources = []
    for d in ctx.attr.data:
      if hasattr(d, "node_sources"):
        sources += d.node_sources.to_list()
      if hasattr(d, "files"):
        sources += d.files.to_list()

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

    expected_exit_code = 0
    if hasattr(ctx.attr, 'expected_exit_code'):
      expected_exit_code = ctx.attr.expected_exit_code

    substitutions = {
        "TEMPLATED_node": ctx.workspace_name + "/" + node.path,
        "TEMPLATED_args": " ".join([
            expand_location_into_runfiles(ctx, a)
            for a in ctx.attr.templated_args]),
        "TEMPLATED_repository_args": ctx.workspace_name + "/" + ctx.file._repository_args.path,
        "TEMPLATED_script_path": script_path,
        "TEMPLATED_env_vars": env_vars,
        "TEMPLATED_expected_exit_code": str(expected_exit_code),
    }
    ctx.actions.expand_template(
        template=ctx.file._launcher_template,
        output=ctx.outputs.script,
        substitutions=substitutions,
        is_executable=True,
    )

    runfiles = depset(sources + [node, ctx.outputs.loader, ctx.file._repository_args] + node_modules + ctx.files._node_runfiles)

    return [DefaultInfo(
        executable = ctx.outputs.script,
        runfiles = ctx.runfiles(
            transitive_files = runfiles,
            files = [node, ctx.outputs.loader] + node_modules + sources,
            collect_data = True,
        ),
    )]

def _collect_node_modules_aspect_impl(target, ctx):
  nm_wksp = None

  if hasattr(ctx.rule.attr, "tags") and "HACKY_MARKER_IS_NODE_MODULE" in ctx.rule.attr.tags:
      nm_wksp = target.label.workspace_root.split("/")[1] if target.label.workspace_root else ctx.workspace_name
      return [NodeModule(workspace = nm_wksp)]

  return []

_collect_node_modules_aspect = aspect(
    implementation = _collect_node_modules_aspect_impl,
    attr_aspects = ["deps"],
)

_NODEJS_EXECUTABLE_ATTRS = {
    "entry_point": attr.string(
        doc = """The script which should be executed first, usually containing a main function.
        This attribute expects a string starting with the workspace name, so that it's not ambiguous
        in cases where a script with the same name appears in another directory or external workspace.
        """,
        mandatory = True),
    "bootstrap": attr.string_list(
        doc = """JavaScript modules to be loaded before the entry point.
        For example, Angular uses this to patch the Jasmine async primitives for
        zone.js before the first `describe`.
        """,
        default = []),
    "install_source_map_support": attr.bool(
        doc = """Install the source-map-support package.
        Enable this to get stack traces that point to original sources, e.g. if the program was written
        in TypeScript.""",
        default = True),
    "data": attr.label_list(
        doc = """Runtime dependencies which may be loaded during execution.""",
        allow_files = True,
        cfg = "data",
        aspects = [sources_aspect, module_mappings_runtime_aspect, _collect_node_modules_aspect]),
    "templated_args": attr.string_list(
        doc = """Arguments which are passed to every execution of the program.
        To pass a node startup option, prepend it with `--node_options=`, e.g.
        `--node_options=--preserve-symlinks`
        """,
    ),
    "node_modules": attr.label(
        doc = """The npm packages which should be available to `require()` during
        execution.
        TODO(alexeagle): add docs about migrating to npm packages in deps[] instead""",
    ),
    "node": attr.label(
        doc = """The node entry point target.""",
        default = Label("@nodejs//:node"),
        allow_files = True,
        single_file = True),
    "_node_runfiles": attr.label(
        default = Label("@nodejs//:node_runfiles"),
        allow_files = True),
    "_repository_args": attr.label(
        default = Label("@nodejs//:bin/node_args.sh"),
        allow_files = True,
        single_file = True),
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
"""
Runs some JavaScript code in NodeJS.
"""

nodejs_test = rule(
    implementation = _nodejs_binary_impl,
    attrs = dict(_NODEJS_EXECUTABLE_ATTRS, **{
      "expected_exit_code": attr.int(
        doc = "The expected exit code for the test. Defaults to 0.",
        default = 0)
    }),
    test = True,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
)
"""
Identical to `nodejs_binary`, except this can be used with `bazel test` as well.
When the binary returns zero exit code, the test passes; otherwise it fails.

`nodejs_test` is a convenient way to write a novel kind of test based on running
your own test runner. For example, the `ts-api-guardian` library has a way to
assert the public API of a TypeScript program, and uses `nodejs_test` here:
https://github.com/angular/angular/blob/master/tools/ts-api-guardian/index.bzl

If you just want to run a standard test using a test runner like Karma or Jasmine,
use the specific rules for those test runners, e.g. `jasmine_node_test`.

To debug a Node.js test, we recommend saving a group of flags together in a "config".
Put this in your `tools/bazel.rc` so it's shared with your team:
```
# Enable debugging tests with --config=debug
test:debug --test_arg=--node_options=--inspect-brk --test_output=streamed --test_strategy=exclusive --test_timeout=9999 --nocache_test_results
```

Now you can add `--config=debug` to any `bazel test` command line.
The runtime will pause before executing the program, allowing you to connect a
remote debugger.
"""

def nodejs_binary_macro(name, data=[], args=[], visibility=None, tags=[], testonly=0, **kwargs):
  """This macro exists only to wrap the nodejs_binary as an .exe for Windows.

  This is exposed in the public API at `//:defs.bzl` as `nodejs_binary`, so most
  users loading `nodejs_binary` are actually executing this macro.

  Args:
    name: name of the label
    data: runtime dependencies
    args: applied to the wrapper binary
    visibility: applied to the wrapper binary
    tags: applied to the wrapper binary
    testonly: applied to nodejs_binary and wrapper binary
    **kwargs: passed to the nodejs_binary
  """
  nodejs_binary(
      name = "%s_bin" % name,
      data = data + ["@bazel_tools//tools/bash/runfiles"],
      testonly = testonly,
      visibility = ["//visibility:private"],
      **kwargs
  )

  native.sh_binary(
      name = name,
      args = args,
      tags = tags,
      srcs = [":%s_bin.sh" % name],
      data = [":%s_bin" % name],
      testonly = testonly,
      visibility = visibility,
  )

def nodejs_test_macro(name, data=[], args=[], visibility=None, tags=[], **kwargs):
  """This macro exists only to wrap the nodejs_test as an .exe for Windows.

  This is exposed in the public API at `//:defs.bzl` as `nodejs_test`, so most
  users loading `nodejs_test` are actually executing this macro.

  Args:
    name: name of the label
    data: runtime dependencies
    args: applied to the wrapper binary
    visibility: applied to the wrapper binary
    tags: applied to the wrapper binary
    **kwargs: passed to the nodejs_test
  """
  nodejs_test(
      name = "%s_bin" % name,
      data = data + ["@bazel_tools//tools/bash/runfiles"],
      testonly = 1,
      tags = ["manual"],
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
