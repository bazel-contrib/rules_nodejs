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

def write_rollup_config(ctx, plugins=[]):
  config = ctx.actions.declare_file("_%s.rollup.conf.js" % ctx.label.name)

  # build_file_path includes the BUILD.bazel file, transform here to only include the dirname
  build_file_dirname = "/".join(ctx.build_file_path.split("/")[:-1])

  entry_points = []
  for e in ctx.attr.entry_points:
    entry_points = entry_points + ["\""+"/".join([ctx.workspace_name, e])+"\""]
  entry_points = ",".join(entry_points)

  mappings = dict()
  all_deps = ctx.attr.deps + ctx.attr.srcs
  for dep in all_deps:
    if hasattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR):
      for k, v in getattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR).items():
        if k in mappings and mappings[k] != v:
          fail(("duplicate module mapping at %s: %s maps to both %s and %s" %
                (dep.label, k, mappings[k], v)), "deps")
        mappings[k] = v

  ctx.actions.expand_template(
      output = config,
      template =  ctx.file._rollup_config_tmpl,
      substitutions = {
          "TMPL_inputs": entry_points,
          "TMPL_bin_dir_path": ctx.bin_dir.path,
          "TMPL_workspace_name": ctx.workspace_name,
          "TMPL_build_file_dirname": build_file_dirname,
          "TMPL_label_name": ctx.label.name,
          "TMPL_module_mappings": str(mappings),
          "TMPL_additional_plugins": ",\n".join(plugins),
      })

  return config

def run_rollup(ctx, config):
  args = ctx.actions.args()
  args.add(["--config", config.path])

  es6_sources = collect_es6_sources(ctx)

  output_dir = ctx.actions.declare_directory("bundles.es6")

  ctx.action(
      executable = ctx.executable._rollup,
      inputs = es6_sources + ctx.files.node_modules + [config],
      outputs = [output_dir],
      arguments = [args]
  )

  return output_dir

def run_tsc(ctx, input_dir):
  config = ctx.actions.declare_file("_%s.tsconfig.json" % ctx.label.name)

  output_dir = ctx.actions.declare_directory("bundles")

  build_file_dirname = ctx.build_file_path.split("/")[:-1]
  input_dir_rerooted = "/".join(input_dir.short_path.split("/")[len(build_file_dirname):])
  output_dir_rerooted = "/".join(output_dir.short_path.split("/")[len(build_file_dirname):])

  ctx.actions.expand_template(
      output = config,
      template =  ctx.file._tsconfig_tmpl,
      substitutions = {
          "TMPL_include_path": input_dir_rerooted + "/*",
          "TMPL_out_dir": output_dir_rerooted,
      })

  args = ctx.actions.args()
  args.add(["--project", config.path])

  ctx.action(
      executable = ctx.executable._tsc,
      inputs = [input_dir, config],
      outputs = [output_dir],
      arguments = [args]
  )

  return output_dir

def run_uglify(ctx, input, output, debug = False):
  config = ctx.actions.declare_file("_%s%s.uglify.json" % (
      ctx.label.name, ".debug" if debug else ""))

  ctx.actions.expand_template(
      output = config,
      template =  ctx.file._uglify_config_tmpl,
      substitutions = {
          "TMPL_notdebug": "false" if debug else "true"
      },
  )

  args = ctx.actions.args()
  args.add(input.path)
  args.add(["--config-file", config.path])
  args.add(["--output", output.path])
  if debug:
    args.add("--beautify")

  ctx.action(
      executable = ctx.executable._uglify,
      inputs = [input, config],
      outputs = [output],
      arguments = [args]
  )

def _rollup_bundle(ctx):
  rollup_config = write_rollup_config(ctx)
  output_dir_es6 = run_rollup(ctx, rollup_config)
  output_dir_es5 = run_tsc(ctx, output_dir_es6)
  #run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min)
  #run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min_debug, debug = True)
  return DefaultInfo(runfiles=ctx.runfiles([output_dir_es6, output_dir_es5]), files=depset([]))

ROLLUP_ATTRS = {
    "entry_points": attr.string_list(mandatory = True),
    "srcs": attr.label_list(allow_files = [".js"]),
    "deps": attr.label_list(aspects = [rollup_module_mappings_aspect]),
    "node_modules": attr.label(default = Label("@//:node_modules")),
    "_rollup": attr.label(
        executable = True,
        cfg="host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:rollup")),
    "_tsc": attr.label(
        executable = True,
        cfg="host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:tsc")),
    "_uglify": attr.label(
        executable = True,
        cfg="host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:uglify")),
    "_tsconfig_tmpl": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:tsconfig.json"),
        allow_files = True,
        single_file = True),
    "_rollup_config_tmpl": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:rollup.config.js"),
        allow_files = True,
        single_file = True),
    "_uglify_config_tmpl": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:uglify.config.json"),
        allow_files = True,
        single_file = True),
}

rollup_bundle = rule(
    implementation = _rollup_bundle,
    attrs = ROLLUP_ATTRS,
)
