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

"""Rollup bundling

The versions of Rollup and Uglify are controlled by the Bazel toolchain.
You do not need to install them into your project.
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

def write_rollup_config(ctx, plugins=[], root_dir=None, filename="_%s.rollup.conf.js", output_format="iife"):
  """Generate a rollup config file.

  This is also used by the ng_rollup_bundle and ng_package rules in @angular/bazel.

  Args:
    ctx: Bazel rule execution context
    plugins: extra plugins (defaults to [])
             See the ng_rollup_bundle in @angular/bazel for example of usage.
    root_dir: root directory for module resolution (defaults to None)
    filename: output filename pattern (defaults to `_%s.rollup.conf.js`)
    output_format: passed to rollup output.format option, e.g. "umd"

  Returns:
    The rollup config file. See https://rollupjs.org/guide/en#configuration-files
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

  if not root_dir:
    root_dir = "/".join([ctx.bin_dir.path, build_file_dirname, ctx.label.name + ".es6"])

  node_modules_path = "/".join([f for f in [
    ctx.attr.node_modules.label.workspace_root,
    ctx.attr.node_modules.label.package,
    "node_modules"
  ] if f])

  ctx.actions.expand_template(
      output = config,
      template =  ctx.file._rollup_config_tmpl,
      substitutions = {
          "TMPL_workspace_name": ctx.workspace_name,
          "TMPL_rootDir": root_dir,
          "TMPL_global_name": ctx.attr.global_name if ctx.attr.global_name else ctx.label.name,
          "TMPL_module_mappings": str(mappings),
          "TMPL_additional_plugins": ",\n".join(plugins),
          "TMPL_banner_file": "\"%s\"" % ctx.file.license_banner.path if ctx.file.license_banner else "undefined",
          "TMPL_stamp_data": "\"%s\"" % ctx.version_file.path if ctx.version_file else "undefined",
          "TMPL_output_format": output_format,
          "TMPL_node_modules_path": node_modules_path,
      })

  return config

def run_rollup(ctx, sources, config, output):
  """Creates an Action that can run rollup on set of sources.

  This is also used by ng_package and ng_rollup_bundle rules in @angular/bazel.

  Args:
    ctx: Bazel rule execution context
    sources: JS sources to rollup
    config: rollup config file
    output: output file

  Returns:
    the sourcemap output file
  """
  map_output = ctx.actions.declare_file(output.basename + ".map", sibling = output)

  args = ctx.actions.args()
  args.add(["--config", config.path])
  args.add(["--output.file", output.path])
  args.add(["--output.sourcemap", "--output.sourcemapFile", map_output.path])
  args.add(["--input", ctx.attr.entry_point])
  # We will produce errors as needed. Anything else is spammy: a well-behaved
  # bazel rule prints nothing on success.
  args.add("--silent")

  args.add("--external")
  args.add(ctx.attr.globals.keys(), join_with=",")

  args.add("--globals")
  args.add(["%s:%s" % g for g in ctx.attr.globals.items()], join_with=",")

  inputs = sources + ctx.files.node_modules + [config]
  if ctx.file.license_banner:
    inputs += [ctx.file.license_banner]
  if ctx.version_file:
    inputs += [ctx.version_file]

  ctx.action(
      executable = ctx.executable._rollup,
      inputs = inputs,
      outputs = [output, map_output],
      arguments = [args]
  )
  return map_output

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

def run_uglify(ctx, input, output, debug = False, comments = True, config_name = None, in_source_map = None):
  """Runs uglify on an input file.

  This is also used by https://github.com/angular/angular.

  Args:
    ctx: Bazel rule execution context
    input: input file
    output: output file
    debug: if True then output is beautified (defaults to False)
    comments: if True then copyright comments are preserved in output file (defaults to True)
    config_name: allows callers to control the name of the generated uglify configuration,
        which will be `_[config_name].uglify.json` in the package where the target is declared
    in_source_map: sourcemap file for the input file, passed to the "--source-map content="
        option of rollup.

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
  inputs = [input, config]

  args.add(input.path)
  args.add(["--config-file", config.path])
  args.add(["--output", output.path])

  # Source mapping options are comma-packed into one argv
  # see https://github.com/mishoo/UglifyJS2#command-line-usage
  source_map_opts = ["includeSources", "base=" + ctx.bin_dir.path]
  if in_source_map:
    source_map_opts.append("content=" + in_source_map.path)
    inputs.append(in_source_map)
  # This option doesn't work in the config file, only on the CLI
  args.add(["--source-map", ",".join(source_map_opts)])

  if comments:
    args.add("--comments")
  if debug:
    args.add("--beautify")

  ctx.action(
      executable = ctx.executable._uglify,
      inputs = inputs,
      outputs = [output, map_output],
      arguments = [args]
  )
  return map_output

def run_sourcemapexplorer(ctx, js, map, output):
  """Runs source-map-explorer to produce an HTML visualization of the sourcemap.

  Args:
    ctx: bazel rule execution context
    js: Javascript bundle
    map: sourcemap from the bundle back to original sources
    output: file where the HTML report is written
  """
  # We must run in a shell in order to redirect stdout.
  # TODO(alexeagle): file a feature request on ctx.actions.run so that stdout
  # could be natively redirected to produce the output file
  ctx.actions.run_shell(
      inputs = [js, map, ctx.executable._source_map_explorer],
      outputs = [output],
      command = "$1 --html $2 $3 > $4",
      arguments = [
          ctx.executable._source_map_explorer.path,
          js.path, map.path, output.path,
      ],
  )

def _rollup_bundle(ctx):
  rollup_config = write_rollup_config(ctx)
  run_rollup(ctx, collect_es6_sources(ctx), rollup_config, ctx.outputs.build_es6)
  _run_tsc(ctx, ctx.outputs.build_es6, ctx.outputs.build_es5)
  source_map = run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min)
  run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min_debug, debug = True)
  umd_rollup_config = write_rollup_config(ctx, filename = "_%s_umd.rollup.conf.js", output_format = "umd")
  run_rollup(ctx, collect_es6_sources(ctx), umd_rollup_config, ctx.outputs.build_umd)
  run_sourcemapexplorer(ctx, ctx.outputs.build_es5_min, source_map, ctx.outputs.explore_html)
  files = [ctx.outputs.build_es5_min, source_map]
  return DefaultInfo(files = depset(files), runfiles = ctx.runfiles(files))

ROLLUP_ATTRS = {
    "entry_point": attr.string(
        doc = """The starting point of the application, passed as the `--input` flag to rollup.
        This should be a path relative to the workspace root.
        """,
        mandatory = True),
    "srcs": attr.label_list(
        doc = """JavaScript source files from the workspace.
        These can use ES2015 syntax and ES Modules (import/export)""",
        allow_files = [".js"]),
    "deps": attr.label_list(
        doc = """Other rules that produce JavaScript outputs, such as `ts_library`.""",
        aspects = [rollup_module_mappings_aspect]),
    "node_modules": attr.label(
        doc = """Dependencies from npm that provide some modules that must be resolved by rollup.""",
        default = Label("@//:node_modules")),
    "license_banner": attr.label(
        doc = """A .txt file passed to the `banner` config option of rollup.
        The contents of the file will be copied to the top of the resulting bundles.
        Note that you can replace a version placeholder in the license file, by using
        the special version `0.0.0-PLACEHOLDER`. See the section on stamping in the README.""",
        allow_single_file = FileType([".txt"])),
    "globals": attr.string_dict(
        doc = """A dict of symbols that reference external scripts.
        The keys are variable names that appear in the program,
        and the values are the symbol to reference at runtime in a global context (UMD bundles).
        For example, a program referencing @angular/core should use ng.core
        as the global reference, so Angular users should include the mapping
        `"@angular/core":"ng.core"` in the globals.""",
        default={}),
    "global_name": attr.string(
        doc = """A name given to this package when referenced as a global variable.
        This name appears in the bundle module incantation at the beginning of the file,
        and governs the global symbol added to the global context (e.g. `window`) as a side-
        effect of loading the UMD/IIFE JS bundle.

        Rollup doc: "The variable name, representing your iife/umd bundle, by which other scripts on the same page can access it."

        This is passed to the `output.name` setting in Rollup.""",),
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
    "_source_map_explorer": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:source-map-explorer")),
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
    "build_umd": "%{name}.umd.js",
    "explore_html": "%{name}.explore.html",
}

rollup_bundle = rule(
    implementation = _rollup_bundle,
    attrs = ROLLUP_ATTRS,
    outputs = ROLLUP_OUTPUTS,
)
"""
Produces several bundled JavaScript files using Rollup and Uglify.

Load it with
`load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")`

It performs this work in several separate processes:
1. Call rollup on the original sources
2. Downlevel the resulting code to es5 syntax for older browsers
3. Minify the bundle with Uglify, possibly with pretty output for human debugging.

The default output of a `rollup_bundle` rule is the non-debug-minified es5 bundle.

However you can request one of the other outputs with a dot-suffix on the target's name.
For example, if your `rollup_bundle` is named `my_rollup_bundle`, you can use one of these labels:

To request the ES2015 syntax (e.g. `class` keyword) without downleveling or minification, use the `:my_rollup_bundle.es6.js` label.
To request the ES5 downleveled bundle without minification, use the `:my_rollup_bundle.js` label
To request the debug-minified es5 bundle, use the `:my_rollup_bundle.min_debug.js` label.
To request a UMD-bundle, use the `:my_rollup_bundle.umd.js` label.

You can also request an analysis from source-map-explorer by buildng the `:my_rollup_bundle.explore.html` label.
However this is currently broken for `rollup_bundle` ES5 mode because we use tsc for downleveling and
it doesn't compose the resulting sourcemaps with an input sourcemap.
See https://github.com/bazelbuild/rules_nodejs/issues/175

For debugging, note that the `rollup.config.js` and `uglify.config.json` files can be found in the bazel-bin folder next to the resulting bundle.

An example usage can be found in https://github.com/bazelbuild/rules_nodejs/tree/master/internal/e2e/rollup
"""
