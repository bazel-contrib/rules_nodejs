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

"TypeScript compilation"

# pylint: disable=unused-argument
# pylint: disable=missing-docstring
load(":common/compilation.bzl", "COMMON_ATTRIBUTES", "compile_ts", "ts_providers_dict_to_struct")
load(":common/tsconfig.bzl", "create_tsconfig")
load(":ts_config.bzl", "TsConfigInfo")

def _compile_action(ctx, inputs, outputs, tsconfig_file, node_opts, description = "prodmode"):
  externs_files = []
  action_outputs = []
  for output in outputs:
    if output.basename.endswith(".externs.js"):
      externs_files.append(output)
    elif output.basename.endswith(".es5.MF"):
      ctx.file_action(output, content="")
    else:
      action_outputs.append(output)

  # TODO(plf): For now we mock creation of files other than {name}.js.
  for externs_file in externs_files:
    ctx.file_action(output=externs_file, content="")

  # A ts_library that has only .d.ts inputs will have no outputs,
  # therefore there are no actions to execute
  if not action_outputs:
    return struct()

  action_inputs = inputs + [f for f in ctx.files.node_modules + ctx.files._tsc_wrapped_deps
                            if f.path.endswith(".js") or f.path.endswith(".ts") or f.path.endswith(".json")]
  if ctx.file.tsconfig:
    action_inputs += [ctx.file.tsconfig]
    if TsConfigInfo in ctx.attr.tsconfig:
      action_inputs += ctx.attr.tsconfig[TsConfigInfo].deps

  # Pass actual options for the node binary in the special "--node_options" argument.
  arguments = ["--node_options=%s" % opt for opt in node_opts]
  # One at-sign makes this a params-file, enabling the worker strategy.
  # Two at-signs escapes the argument so it's passed through to tsc_wrapped
  # rather than the contents getting expanded.
  if ctx.attr.supports_workers:
    arguments.append("@@" + tsconfig_file.path)
    mnemonic = "TypeScriptCompile"
  else:
    arguments.append("-p")
    arguments.append(tsconfig_file.path)
    mnemonic = "tsc"

  ctx.action(
      progress_message = "Compiling TypeScript (%s) %s" % (description, ctx.label),
      mnemonic = mnemonic,
      inputs = action_inputs,
      outputs = action_outputs,
      arguments = arguments,
      executable = ctx.executable.compiler,
      execution_requirements = {
          "supports-workers": str(int(ctx.attr.supports_workers)),
      },
  )

  # Enable the replay_params in case an aspect needs to re-build this library.
  return struct(
      label = ctx.label,
      tsconfig = tsconfig_file,
      inputs = action_inputs,
      outputs = action_outputs,
      compiler = ctx.executable.compiler,
  )


def _devmode_compile_action(ctx, inputs, outputs, tsconfig_file, node_opts):
  _compile_action(ctx, inputs, outputs, tsconfig_file, node_opts,
                  description = "devmode")

def tsc_wrapped_tsconfig(ctx,
                         files,
                         srcs,
                         devmode_manifest=None,
                         jsx_factory=None,
                         **kwargs):
  """Produce a tsconfig.json that sets options required under Bazel.
  """

  # The location of tsconfig.json is interpreted as the root of the project
  # when it is passed to the TS compiler with the `-p` option:
  #   https://www.typescriptlang.org/docs/handbook/tsconfig-json.html.
  # Our tsconfig.json is in bazel-foo/bazel-out/local-fastbuild/bin/{package_path}
  # because it's generated in the execution phase. However, our source files are in
  # bazel-foo/ and therefore we need to strip some parent directories for each
  # f.path.

  config = create_tsconfig(ctx, files, srcs,
                           devmode_manifest=devmode_manifest,
                           **kwargs)
  config["bazelOptions"]["nodeModulesPrefix"] = "/".join([p for p in [
    ctx.attr.node_modules.label.workspace_root,
    ctx.attr.node_modules.label.package,
    "node_modules"
  ] if p])

  if config["compilerOptions"]["target"] == "es6":
    config["compilerOptions"]["module"] = "es2015"
  else:
    # The "typescript.es5_sources" provider is expected to work
    # in both nodejs and in browsers.
    # NOTE: tsc-wrapped will always name the enclosed AMD modules
    config["compilerOptions"]["module"] = "umd"

  # If the user gives a tsconfig attribute, the generated file should extend
  # from the user's tsconfig.
  # See https://github.com/Microsoft/TypeScript/issues/9876
  # We subtract the ".json" from the end before handing to TypeScript because
  # this gives extra error-checking.
  if ctx.file.tsconfig:
    workspace_path = config["compilerOptions"]["rootDir"]
    config["extends"] = "/".join([workspace_path, ctx.file.tsconfig.path[:-len(".json")]])

  if jsx_factory:
    config["compilerOptions"]["jsxFactory"] = jsx_factory

  return config

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
  ts_providers = compile_ts(ctx, is_library=True,
                            compile_action=_compile_action,
                            devmode_compile_action=_devmode_compile_action,
                            tsc_wrapped_tsconfig=tsc_wrapped_tsconfig)
  return ts_providers_dict_to_struct(ts_providers)

ts_library = rule(
    _ts_library_impl,
    attrs = dict(COMMON_ATTRIBUTES, **{
        "srcs": attr.label_list(
            doc = "The TypeScript source files to compile.",
            allow_files = [".ts", ".tsx"],
            mandatory = True),

        # TODO(alexeagle): reconcile with google3: ts_library rules should
        # be portable across internal/external, so we need this attribute
        # internally as well.
        "tsconfig": attr.label(
            doc = """A tsconfig.json file containing settings for TypeScript compilation.
            Note that some properties in the tsconfig are governed by Bazel and will be
            overridden, such as `target` and `module`.""",
            allow_files = True, single_file = True),
        "compiler": attr.label(
            doc = """Intended for internal use only.
            Sets a different TypeScript compiler binary to use for this library.
            For example, we use the vanilla TypeScript tsc.js for bootstrapping,
            and Angular compilations can replace this with `ngc`.""",
            default = Label("//internal:tsc_wrapped_bin"),
            single_file = False,
            allow_files = True,
            executable = True,
            cfg = "host"),
        "supports_workers": attr.bool(
            doc = """Intended for internal use only.
            Allows you to disable the Bazel Worker strategy for this library.
            Typically used together with the "compiler" setting when using a
            non-worker aware compiler binary.""",
            default = True),
        "tsickle_typed": attr.bool(default = True),
        "internal_testing_type_check_dependencies": attr.bool(default = False, doc="Testing only, whether to type check inputs that aren't srcs."),
        "_tsc_wrapped_deps": attr.label(default = Label("@build_bazel_rules_typescript_tsc_wrapped_deps//:node_modules")),
        # @// is special syntax for the "main" repository
        # The default assumes the user specified a target "node_modules" in their
        # root BUILD file.
        "node_modules": attr.label(default = Label("@//:node_modules")),
    }),
    outputs = {
        "tsconfig": "%{name}_tsconfig.json"
    }
)
"""
`ts_library` type-checks and compiles a set of TypeScript sources to JavaScript.

It produces declarations files (`.d.ts`) which are used for compiling downstream
TypeScript targets and JavaScript for the browser and Closure compiler.
"""
