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
load("//internal/common:module_mappings.bzl", "get_module_mappings")

_ROLLUP_MODULE_MAPPINGS_ATTR = "rollup_module_mappings"

def _rollup_module_mappings_aspect_impl(target, ctx):
  mappings = get_module_mappings(target.label, ctx.rule.attr)
  return struct(rollup_module_mappings = mappings)

rollup_module_mappings_aspect = aspect(
    _rollup_module_mappings_aspect_impl,
    attr_aspects = ["deps"],
)

def _rollup_bundle(ctx):
  rollup_config = ctx.actions.declare_file("%s.rollup.conf.js" % ctx.label.name)

  # build_file_path includes the BUILD.bazel file, transform here to only include the dirname
  buildFileDirname = "/".join(ctx.build_file_path.split("/")[:-1])

  mappings = dict()
  for dep in ctx.attr.deps:
    if hasattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR):
      for k, v in getattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR).items():
        if k in mappings and mappings[k] != v:
          fail(("duplicate module mapping at %s: %s maps to both %s and %s" %
                (dep.label, k, mappings[k], v)), "deps")
        mappings[k] = v

  ctx.actions.expand_template(
      output = rollup_config,
      template =  ctx.file._rollup_config_tmpl,
      substitutions = {
          "TMPL_bin_dir_path": ctx.bin_dir.path,
          "TMPL_workspace_name": ctx.workspace_name,
          "TMPL_build_file_dirname": buildFileDirname,
          "TMPL_label_name": ctx.label.name,
          "TMPL_module_mappings": str(mappings),
      })

  entryPoint = "/".join([ctx.workspace_name, ctx.attr.entry_point])

  argsRollup = ctx.actions.args()
  argsRollup.add("--config")
  argsRollup.add(rollup_config.path)
  argsRollup.add("--output.file")
  argsRollup.add(ctx.outputs.build_es6.path)
  argsRollup.add("--input")
  argsRollup.add(entryPoint)

  es6_sources = collect_es6_sources(ctx)

  ctx.action(
      executable = ctx.executable._rollup,
      inputs = es6_sources + [rollup_config] + ctx.files.node_modules,
      outputs = [ctx.outputs.build_es6],
      arguments = [argsRollup]
  )

  argsES5 = ctx.actions.args()
  argsES5.add("--target")
  argsES5.add("es5")
  argsES5.add("--allowJS")
  argsES5.add(ctx.outputs.build_es6.path)
  argsES5.add("--outFile")
  argsES5.add(ctx.outputs.build_es5.path)

  ctx.action(
      executable = ctx.executable._es5,
      inputs = [ctx.outputs.build_es6],
      outputs = [ctx.outputs.build_es5],
      arguments = [argsES5]
  )

  argsUglify = ctx.actions.args()
  argsUglify.add(ctx.outputs.build_es5.path)
  argsUglify.add("--output")
  argsUglify.add(ctx.outputs.build_es5_min.path)

  ctx.action(
      executable = ctx.executable._uglify,
      inputs = [ctx.outputs.build_es5],
      outputs = [ctx.outputs.build_es5_min],
      arguments = [argsUglify]
  )

  return DefaultInfo(files=depset([ctx.outputs.build_es5_min]))

rollup_bundle = rule(
    implementation = _rollup_bundle,
    attrs = {
        "entry_point": attr.string(mandatory=True),
        "deps": attr.label_list(allow_files = True, aspects = [rollup_module_mappings_aspect]),
        "node_modules": attr.label(default = Label("@//:node_modules")),
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
