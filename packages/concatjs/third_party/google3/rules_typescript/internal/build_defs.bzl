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

"""TypeScript rules.
"""
# pylint: disable=unused-argument
# pylint: disable=missing-docstring
load(":common/compilation.bzl", "compile_ts")
load(":executables.bzl", "get_tsc", "get_node")
load(":common/json_marshal.bzl", "json_marshal")
load(":common/tsconfig.bzl", "create_tsconfig")
load(":common/module_mappings.bzl", "module_mappings_aspect")

def _compile_action(ctx, inputs, outputs, config_file_path):
  externs_files = []
  non_externs_files = []
  for output in outputs:
    if output.basename.endswith(".externs.js"):
      externs_files.append(output)
    elif output.basename.endswith(".es5.MF"):
      ctx.file_action(output, content="")
    else:
      non_externs_files.append(output)

  # TODO(plf): For now we mock creation of files other than {name}.js.
  for externs_file in externs_files:
    ctx.file_action(output=externs_file, content="")

  action_inputs = inputs
  if ctx.file.tsconfig:
    action_inputs += [ctx.file.tsconfig]

  # One at-sign makes this a params-file, enabling the worker strategy.
  # Two at-signs escapes the argument so it's passed through to tsc_wrapped
  # rather than the contents getting expanded.
  if ctx.attr.supports_workers:
    arguments = ["@@" + config_file_path]
  else:
    arguments = ["-p", config_file_path]

  ctx.action(
      progress_message = "Compiling TypeScript (devmode) %s" % ctx,
      mnemonic = "TypeScriptCompile",
      inputs = action_inputs,
      outputs = non_externs_files,
      arguments = arguments,
      executable = ctx.executable.compiler,
      execution_requirements = {
          "supports-workers": str(int(ctx.attr.supports_workers)),
      },
  )


def _devmode_compile_action(ctx, inputs, outputs, config_file_path):
  _compile_action(ctx, inputs, outputs, config_file_path)

def tsc_wrapped_tsconfig(ctx,
                         files,
                         srcs,
                         devmode_manifest=None,
                         tsickle_externs=None,
                         type_blacklisted_declarations=[],
                         allowed_deps=set(),
                         jsx_factory=None,
                         ngc_out=[]):
  variant = ""
  if devmode_manifest: variant += "_es5"
  tsconfig_json = ctx.new_file(ctx.label.name + variant + "_tsconfig.json")

  # The location of tsconfig.json is interpreted as the root of the project
  # when it is passed to the TS compiler with the `-p` option:
  #   https://www.typescriptlang.org/docs/handbook/tsconfig-json.html.
  # Our tsconfig.json is in bazel-foo/bazel-out/local-fastbuild/bin/{package_path}
  # because it's generated in the execution phase. However, our source files are in
  # bazel-foo/ and therefore we need to strip some parent directories for each
  # f.path.

  workspace_path = "/".join([".."] * len(tsconfig_json.dirname.split("/")))
  host_bin = "bazel-out/host/bin"

  runfiles = ctx.executable.compiler.short_path + ".runfiles"
  # When building within this repo, the executable comes from the local path
  # like bazel-bin/internal/tsc_wrapped/tsc.runfiles
  # But when building in some user's repo that depends on this one, the path in
  # that repo has extra segments to point into Bazel's "external" directory.
  # like bazel-bin/external/io_bazel_rules_typescript/internal/tsc_wrapped/tsc.runfiles
  if ctx.executable.compiler.short_path.startswith(".."):
    runfiles = "/".join(["external/io_bazel_rules_typescript", runfiles])

  module_roots = {
      "*": [
          "/".join([host_bin, runfiles, "npm/installed/node_modules/*"]),
      ],
      # Workaround https://github.com/Microsoft/TypeScript/issues/15962
      # Needed for Angular to build with Bazel.
      # TODO(alexeagle): fix the bug upstream or find a better place for
      # this workaround.
      "zone.js": [
          "/".join([host_bin, runfiles, "npm/installed/node_modules/zone.js/dist/zone.js.d.ts"]),
      ]
  }

  config = create_tsconfig(ctx, files, srcs, tsconfig_json.dirname,
                           devmode_manifest=devmode_manifest,
                           module_roots=module_roots)

  config["compilerOptions"].update({
      "typeRoots": ["/".join([
          workspace_path, host_bin, runfiles,
          "npm/installed/node_modules/@types"]
      )],
  })
  config["bazelOptions"]["nodeModulesPrefix"] = "/".join([host_bin, runfiles, "npm/installed/node_modules"])

  # If the user gives a tsconfig attribute, the generated file should extend
  # from the user's tsconfig.
  # See https://github.com/Microsoft/TypeScript/issues/9876
  # We subtract the ".json" from the end before handing to TypeScript because
  # this gives extra error-checking.
  if ctx.file.tsconfig:
    config["extends"] = "{}/{}".format(workspace_path, ctx.file.tsconfig.path[:-5])

  ctx.file_action(output=tsconfig_json, content=json_marshal(config))
  return tsconfig_json

# ************ #
# ts_library   #
# ************ #


def _ts_library_impl(ctx):
  """Implementation of ts_library.

  Args:
    ctx: the context.
  Returns:
    the struct returned by the call to compile_ts.
  """
  ctx.file_action(
      output = ctx.outputs._js_typings,
      content = "")

  return compile_ts(ctx, is_library=True, compile_action=_compile_action,
                    devmode_compile_action=_devmode_compile_action,
                    tsc_wrapped_tsconfig=tsc_wrapped_tsconfig)

ts_library = rule(
    _ts_library_impl,
    attrs={
        "srcs":
            attr.label_list(
                allow_files=FileType([
                    ".ts",
                    ".tsx",
                ]),
                mandatory=True,),
        "deps":
            attr.label_list(aspects = [module_mappings_aspect]),
        # Used to determine module mappings, see below.
        "module_name": attr.string(),
        "module_root": attr.string(),

        # TODO(evanm): make this the default and remove the option.
        "runtime":
            attr.string(default="browser"),
        # TODO(alexeagle): reconcile with google3: ts_library rules should
        # be portable across internal/external, so we need this attribute
        # internally as well.
        "tsconfig":
            attr.label(allow_files = True, single_file=True),
        "_additional_d_ts":
            attr.label_list(),
        "compiler":
            attr.label(
                default=get_tsc(),
                single_file=False,
                allow_files=True,
                executable=True,
                cfg="host",),
        "supports_workers": attr.bool(default = True),
        "_node":
            attr.label(
                default=get_node(),
                single_file=True,
                allow_files=True,
                executable=True,
                cfg="host",),
        "_node_modules": attr.label(default = Label("@npm//installed:node_modules")),
    },
    fragments=["js"],
    outputs={"_js_typings": "_%{name}_js_typings.d.ts"},)
