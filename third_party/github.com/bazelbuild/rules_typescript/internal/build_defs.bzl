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
load(":common/compilation.bzl", "COMMON_ATTRIBUTES", "compile_ts", "ts_providers_dict_to_struct")
load(":executables.bzl", "get_tsc")
load(":common/tsconfig.bzl", "create_tsconfig")
load(":ts_config.bzl", "TsConfig")

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

  action_inputs = inputs + [f for f in ctx.files.node_modules
                            if f.path.endswith(".ts") or f.path.endswith(".json")]
  if ctx.file.tsconfig:
    action_inputs += [ctx.file.tsconfig]
    if TsConfig in ctx.attr.tsconfig:
      action_inputs += ctx.attr.tsconfig[TsConfig].deps

  # One at-sign makes this a params-file, enabling the worker strategy.
  # Two at-signs escapes the argument so it's passed through to tsc_wrapped
  # rather than the contents getting expanded.
  if ctx.attr.supports_workers:
    arguments = ["@@" + config_file_path]
    mnemonic = "TypeScriptCompile"
  else:
    arguments = ["-p", config_file_path]
    mnemonic = "tsc"

  ctx.action(
      progress_message = "Compiling TypeScript (devmode) %s" % ctx.label,
      mnemonic = mnemonic,
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
                         jsx_factory=None,
                         **kwargs):

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
  config["bazelOptions"]["nodeModulesPrefix"] = "node_modules"
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
        "srcs":
            attr.label_list(
                allow_files=FileType([
                    ".ts",
                    ".tsx",
                ]),
                mandatory=True,),

        # TODO(alexeagle): reconcile with google3: ts_library rules should
        # be portable across internal/external, so we need this attribute
        # internally as well.
        "tsconfig":
            attr.label(allow_files = True, single_file = True),
        "compiler":
            attr.label(
                default=get_tsc(),
                single_file=False,
                allow_files=True,
                executable=True,
                cfg="host"),
        "supports_workers": attr.bool(default = True),
        # @// is special syntax for the "main" repository
        # The default assumes the user specified a target "node_modules" in their
        # root BUILD file.
        "node_modules": attr.label(default = Label("@//:node_modules")),
    }),
    outputs = {
        "tsconfig": "%{name}_tsconfig.json"
    }
)
