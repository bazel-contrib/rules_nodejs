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
load("//internal:node.bzl", nodejs_binary = "nodejs_binary_macro")
load("//internal:common/module_mappings.bzl", "module_mappings_runtime_aspect")
load("//internal:collect_es6_sources.bzl", "collect_es6_sources")

def _es6_consumer(ctx):
  sources = collect_es6_sources(ctx)
  
  return [DefaultInfo(
      files = sources,
      runfiles = ctx.runfiles(sources.to_list()),
  )]

es6 = rule(
    implementation = _es6_consumer,
    attrs = {
        "deps": attr.label_list()
    }
)

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

def _rollup(ctx):
  rollup_config = ctx.actions.declare_file("%s.rollup.conf.js" % ctx.label.name)

  buildFilePath = "/".join(ctx.build_file_path.split("/")[:-1])

  ctx.actions.expand_template(
      output = rollup_config,
      template =  ctx.file._rollup_config_tmpl,
      substitutions = {
          "TMPL_workspace_name": ctx.workspace_name,
          "TMPL_build_file_path": buildFilePath,
          "TMPL_es6_label_name": "es6",
      })

  entryPoint = "bazel-out/host/bin/{0}/rollup.runfiles/{1}/{2}/es6.es6/{3}".format(buildFilePath, ctx.workspace_name, buildFilePath, ctx.attr.entry_point)

  args = ["--config", rollup_config.path]
  args += ["--output.file", ctx.outputs.build_es6.path]
  args += ["--input", entryPoint]

  ctx.action(
      executable = ctx.executable.rollup,
      inputs = [rollup_config],
      outputs = [ctx.outputs.build_es6],
      arguments = args
  )

  argsTS = ["--target", "es5"]
  argsTS += ["--allowJS"]
  argsTS += [ctx.outputs.build_es6.path]
  argsTS += ["--outFile", ctx.outputs.build_es5.path]

  ctx.action(
      executable = ctx.executable.typescript,
      inputs = [ctx.outputs.build_es6],
      outputs = [ctx.outputs.build_es5],
      arguments = argsTS
  )

  argsUglify = [ctx.outputs.build_es5.path]
  argsUglify += ["--output", ctx.outputs.build_es5_min.path]

  ctx.action(
      executable = ctx.executable.uglify,
      inputs = [ctx.outputs.build_es5],
      outputs = [ctx.outputs.build_es5_min],
      arguments = argsUglify
  )

  return struct()

rollup = rule(
    implementation = _rollup,
    attrs = {
        "entry_point": attr.string(mandatory=True),
        "data": attr.label_list(
            allow_files = True,
            cfg = "data",
            aspects=[sources_aspect, module_mappings_runtime_aspect]),
        "node_modules": attr.label(
            # By default, binaries use the node_modules in the workspace
            # where the bazel command is run. This assumes that any needed
            # dependencies are installed there, commonly due to a transitive
            # dependency on a package like @bazel/typescript.
            # See discussion: https://github.com/bazelbuild/rules_typescript/issues/13
            default = Label("@//:node_modules")),
        "rollup": attr.label(executable=True, cfg="host", allow_files=True),
        "typescript": attr.label(executable=True, cfg="host", allow_files=True),
        "uglify": attr.label(executable=True, cfg="host", allow_files=True),
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

def rollup_macro(data = [], node_modules = Label("@//:node_modules"), **kwargs):
  es6(
      name = "es6",
      deps = data,
  )

  nodejs_binary(
      name = "rollup",
      entry_point = "build_bazel_rules_nodejs_rollup_deps/node_modules/rollup/bin/rollup",
      data = [
        ":es6",
        node_modules,
        "@build_bazel_rules_nodejs//internal/rollup:rollup.config.js",
      ],
      node_modules = "@build_bazel_rules_nodejs_rollup_deps//:node_modules"
  )

  nodejs_binary(
      name = "es5",
      entry_point = "build_bazel_rules_nodejs_rollup_deps/node_modules/typescript/bin/tsc",
      node_modules = "@build_bazel_rules_nodejs_rollup_deps//:node_modules"
  )

  nodejs_binary(
      name = "uglify",
      entry_point = "build_bazel_rules_nodejs_rollup_deps/node_modules/uglify-js/bin/uglifyjs",
      node_modules = "@build_bazel_rules_nodejs_rollup_deps//:node_modules"
  )

  rollup(
      rollup = ":rollup",
      typescript = ":es5",
      uglify = ":uglify",
      **kwargs
  )
