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
load("//internal/common:collect_es6_sources.bzl", "collect_es6_sources")
load("//internal/common:module_mappings.bzl", "get_module_mappings")

_ROLLUP_MODULE_MAPPINGS_ATTR = "rollup_module_mappings"

def _rollup_module_mappings_aspect_impl(target, ctx):
  mappings = get_module_mappings(target.label, ctx.rule.attr)
  return struct(rollup_module_mappings = mappings)

rollup_module_mappings_aspect = aspect(
    _rollup_module_mappings_aspect_impl,
    attr_aspects = ["deps"],
)

def write_rollup_config(ctx, plugins=[], root_dirs=None, filename="_%s.rollup.conf.js"):
  """Generate a rollup config file

  This is also used by https://github.com/angular/angular.

  Args:
    ctx: context
    plugins: extra plugins (defaults to [])
    root_dirs: root directories for module resolution (defaults to None)
    filename: output filename pattern (defaults to "_%s.rollup.conf.js")

  Returns:
    The rollup config file
  """
  config = ctx.actions.declare_file(filename % ctx.label.name)

  # build_file_path includes the BUILD.bazel file, transform here to only include the dirname
  build_file_dirname = "/".join(ctx.build_file_path.split("/")[:-1])

  mappings = dict()
  all_deps = ctx.attr.deps + ctx.attr.srcs
  for dep in all_deps:
    if hasattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR):
      for k, v in getattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR).items():
        if k in mappings and mappings[k] != v:
          fail(("duplicate module mapping at %s: %s maps to both %s and %s" %
                (dep.label, k, mappings[k], v)), "deps")
        mappings[k] = v

  if not root_dirs:
    root_dirs = ["/".join([ctx.bin_dir.path, build_file_dirname, ctx.label.name + ".es6"])]

  ctx.actions.expand_template(
      output = config,
      template =  ctx.file._rollup_config_tmpl,
      substitutions = {
          "TMPL_workspace_name": ctx.workspace_name,
          "TMPL_rootDirs": str(root_dirs),
          "TMPL_label_name": ctx.label.name,
          "TMPL_module_mappings": str(mappings),
          "TMPL_additional_plugins": ",\n".join(plugins),
          "TMPL_banner_file": "\"%s\"" % ctx.file.license_banner.path if ctx.file.license_banner else "undefined",
          "TMPL_stamp_data": "\"%s\"" % ctx.file.stamp_data.path if ctx.file.stamp_data else "undefined",
      })

  return config

def run_rollup(ctx, sources, config, output):
  """Runs rollup on set of sources

  This is also used by https://github.com/angular/angular.

  Args:
    ctx: context
    sources: sources to rollup
    config: rollup config file
    output: output file
  """
  args = ctx.actions.args()
  args.add(["--config", config.path])
  args.add(["--output.file", output.path])
  args.add(["--input", ctx.attr.entry_point])
  inputs = sources + ctx.files.node_modules + [config]
  if ctx.file.license_banner:
    inputs += [ctx.file.license_banner]
  if ctx.file.stamp_data:
    inputs += [ctx.file.stamp_data]

  ctx.action(
      executable = ctx.executable._rollup,
      inputs = inputs,
      outputs = [output],
      arguments = [args]
  )

def _run_tsc(ctx, input, output):
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

def run_uglify(ctx, input, output, debug = False, comments = True, config_name = None):
  """Runs uglify on an input file

  This is also used by https://github.com/angular/angular.

  Args:
    ctx: context
    input: input file
    output: output file
    debug: if True then output is beautified (defaults to False)
    comments: if True then copyright comments are preserved in output file (defaults to True)
    config_name: allows callers to control the name of the generated uglify configuration,
        which will be _[config_name].uglify.json in the package where the target is declared

  Returns:
    The sourcemap file
  """
  map_output = ctx.actions.declare_file(output.basename + ".map", sibling = output)

  if not config_name:
    config_name = ctx.label.name
    if debug:
      config_name += ".debug"

  config = ctx.actions.declare_file("_%s.uglify.json" % config_name)

  ctx.actions.expand_template(
      output = config,
      template =  ctx.file._uglify_config_tmpl,
      substitutions = {
          "TMPL_notdebug": "false" if debug else "true",
          "TMPL_sourcemap": map_output.path,
      },
  )

  args = ctx.actions.args()
  args.add(input.path)
  args.add(["--config-file", config.path])
  args.add(["--output", output.path])
  # This option doesn't work in the config file, only on the CLI
  args.add(["--source-map", "includeSources,base=" + ctx.bin_dir.path])
  if comments:
    args.add("--comments")
  if debug:
    args.add("--beautify")

  ctx.action(
      executable = ctx.executable._uglify,
      inputs = [input, config],
      outputs = [output, map_output],
      arguments = [args]
  )
  return map_output

def _rollup_bundle(ctx):
  rollup_config = write_rollup_config(ctx)
  run_rollup(ctx, collect_es6_sources(ctx), rollup_config, ctx.outputs.build_es6)
  _run_tsc(ctx, ctx.outputs.build_es6, ctx.outputs.build_es5)
  source_map = run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min)
  run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min_debug, debug = True)
  return DefaultInfo(files=depset([ctx.outputs.build_es5_min, source_map]))

ROLLUP_ATTRS = {
    "entry_point": attr.string(mandatory = True),
    "srcs": attr.label_list(allow_files = [".js"]),
    "deps": attr.label_list(aspects = [rollup_module_mappings_aspect]),
    "node_modules": attr.label(default = Label("@//:node_modules")),
    "license_banner": attr.label(allow_single_file = FileType([".txt"])),
    "stamp_data": attr.label(allow_single_file = FileType([".txt"])),
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
