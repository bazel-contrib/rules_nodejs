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

"""Rules for production rollup bundling.
"""
load("//internal:collect_es6_sources.bzl", "collect_es6_sources")

def _rollup(ctx):
  rollup_config = ctx.actions.declare_file("%s.rollup.conf.js" % ctx.label.name)

  buildFilePath = "/".join(ctx.build_file_path.split("/")[:-1])

  ctx.actions.expand_template(
      output = rollup_config,
      template =  ctx.file._rollup_config_tmpl,
      substitutions = {
          "TMPL_bin_dir_path": ctx.bin_dir.path,
          "TMPL_workspace_name": ctx.workspace_name,
          "TMPL_build_file_path": buildFilePath,
          "TMPL_label_name": ctx.label.name,
      })

  entryPoint = "{0}/{1}".format(ctx.workspace_name, ctx.attr.entry_point)

  args = ["--config", rollup_config.path]
  args += ["--output.file", ctx.outputs.build_es6.path]
  args += ["--input", entryPoint]

  es6_sources = collect_es6_sources(ctx)

  ctx.action(
      executable = ctx.executable._rollup,
      inputs = es6_sources + [rollup_config] + ctx.files.node_modules,
      outputs = [ctx.outputs.build_es6],
      arguments = args
  )

  argsTS = ["--target", "es5"]
  argsTS += ["--allowJS"]
  argsTS += [ctx.outputs.build_es6.path]
  argsTS += ["--outFile", ctx.outputs.build_es5.path]

  ctx.action(
      executable = ctx.executable._es5,
      inputs = [ctx.outputs.build_es6],
      outputs = [ctx.outputs.build_es5],
      arguments = argsTS
  )

  argsUglify = [ctx.outputs.build_es5.path]
  argsUglify += ["--output", ctx.outputs.build_es5_min.path]

  ctx.action(
      executable = ctx.executable._uglify,
      inputs = [ctx.outputs.build_es5],
      outputs = [ctx.outputs.build_es5_min],
      arguments = argsUglify
  )

  return struct()

rollup = rule(
    implementation = _rollup,
    attrs = {
        "entry_point": attr.string(mandatory=True),
        "deps": attr.label_list(allow_files = True),
        "node_modules": attr.label(
            # By default, binaries use the node_modules in the workspace
            # where the bazel command is run. This assumes that any needed
            # dependencies are installed there, commonly due to a transitive
            # dependency on a package like @bazel/typescript.
            # See discussion: https://github.com/bazelbuild/rules_typescript/issues/13
            default = Label("@//:node_modules")),
        "_rollup": attr.label(
            executable = True,
            cfg="host",
            default = Label("@build_bazel_rules_nodejs//internal/rollup:rollup")),
        "_es5": attr.label(
            executable = True,
            cfg="host",
            default = Label("@build_bazel_rules_nodejs//internal/rollup:es5")),
        "_uglify": attr.label(
            executable = True,
            cfg="host",
            default = Label("@build_bazel_rules_nodejs//internal/rollup:uglify")),
        "_rollup_config_tmpl": attr.label(
            default = Label("@build_bazel_rules_nodejs//internal/rollup:rollup.config.js"),
            allow_files = True,
            single_file = True),
    },
    outputs = {
        "build_es6": "%{name}.es6.js",
        "build_es5": "%{name}.js",
        "build_es5_min": "%{name}.min.js"
    }
)
