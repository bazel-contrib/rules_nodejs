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
  buildFileDirname = "/".join(ctx.build_file_path.split("/")[:-1])

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
          "TMPL_bin_dir_path": ctx.bin_dir.path,
          "TMPL_workspace_name": ctx.workspace_name,
          "TMPL_build_file_dirname": buildFileDirname,
          "TMPL_label_name": ctx.label.name,
          "TMPL_module_mappings": str(mappings),
          "TMPL_additional_plugins": str(plugins),
      })

  return config

def run_rollup(ctx, config, output):
  entryPoint = "/".join([ctx.workspace_name, ctx.attr.entry_point])

  args = ctx.actions.args()
  args.add(["--config", config.path])
  args.add(["--output.file", output.path])
  args.add(["--input", entryPoint])

  es6_sources = collect_es6_sources(ctx)

  ctx.action(
      executable = ctx.executable._rollup,
      inputs = es6_sources + ctx.files.node_modules + [config],
      outputs = [output],
      arguments = [args]
  )

def run_tsc(ctx, input, output):
  args = ctx.actions.args()
  args.add(["--target", "es5"])
  args.add("--allowJS")
  args.add(input.path)
  args.add(["--outFile", output.path])

  ctx.action(
      executable = ctx.executable._tsc,
      inputs = [input],
      outputs = [output],
      arguments = [args]
  )

def run_uglify(ctx, input, output, debug = False):
  config = ctx.actions.declare_file("_%s%s.uglify.json" % (
      ctx.label.name, ".debug" if debug else ""))

  ctx.actions.expand_template(
      output = config,
      template =  ctx.file._uglify_config_tmpl,
      substitutions = {
          "TMPL_mangle": "false" if debug else "true"
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
  run_rollup(ctx, rollup_config, ctx.outputs.build_es6)
  run_tsc(ctx, ctx.outputs.build_es6, ctx.outputs.build_es5)
  run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min)
  run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min_debug, debug = True)
  return DefaultInfo(files=depset([ctx.outputs.build_es5_min]))

ROLLUP_ATTRS = {
    "entry_point": attr.string(mandatory = True),
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
    "_rollup_config_tmpl": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:rollup.config.js"),
        allow_files = True,
        single_file = True),
    "_uglify_config_tmpl": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:uglify.config.json"),
        allow_files = True,
        single_file = True),
}

ROLLUP_OUTPUTS = {
    "build_es6": "%{name}.es6.js",
    "build_es5": "%{name}.js",
    "build_es5_min": "%{name}.min.js",
    "build_es5_min_debug": "%{name}.min_debug.js",
}

rollup_bundle = rule(
    implementation = _rollup_bundle,
    attrs = ROLLUP_ATTRS,
    outputs = ROLLUP_OUTPUTS,
)
