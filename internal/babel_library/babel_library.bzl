
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

"""Babel support

babel_library allows defining a set of next generation javascript sources
and uses babel to compile them for runtimes of today. It also brings
compatibility with rules_typescript.
"""

load("@bazel_skylib//:lib.bzl", "paths")

_DEFAULT_BABEL_BIN = "@npm//@bazel/babel/bin:babel"

# get the path of the file relative the the package "root"
def _get_package_path(ctx, file):
  trim = 0
  # for targets in external workspaces
  if len(ctx.label.workspace_root) > 0:
    trim += len(ctx.label.workspace_root) + 1 # +1 for the slash

  if len(ctx.label.package) > 0:
    trim += len(ctx.label.package) + 1 # +1 for the slash

  # generated files live in the bin-dir
  if not file.is_source:
    trim += len(ctx.bin_dir.path) + 1 # +1 for the slash

  path = file.path[trim:]
  return path

def _write_config(ctx):
  output = ctx.actions.declare_file('%s.babelrc' % ctx.label.name)
  ctx.actions.expand_template(
    output = output,
    template =  ctx.file._babelrc_tmpl,
    substitutions = {
        "TMPL_bin_dir_path": ctx.bin_dir.path,
        "TMPL_module_name": ctx.attr.module_name,
    }
  )
  return output

def _create_babel_args(ctx, config_path, out_dir):
  out = paths.join(ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package, out_dir)
  args = ctx.actions.args()
  args.add("--out-dir", out)
  args.add("--config-file", config_path)
  all_other_args = []
  for src in ctx.files.srcs:
    all_other_args.append(src)
    all_other_args.append(_get_package_path(ctx, src))

  args.add_all(all_other_args)
  return args

def _declare_babel_outputs(ctx, out_dir):
  return [ctx.actions.declare_file(paths.join(out_dir, _get_package_path(ctx, src))) for src in ctx.files.srcs]

def _run_babel(ctx, inputs, outputs, args, mnemonic, description):
  ctx.actions.run(
    executable = ctx.executable.babel,
    inputs = inputs,
    outputs = outputs,
    arguments = [args],
    mnemonic = mnemonic,
    progress_message = "Compiling Javascript (%s) %s" % (description, ctx.label),
    execution_requirements = { "no-sandbox": ctx.attr.no_sandbox },
  )

def _babel_conversion(ctx, inputs, config, out_dir, mnemonic, description):
  outputs = _declare_babel_outputs(ctx, out_dir)
  args = _create_babel_args(ctx, config.path, out_dir)
  _run_babel(ctx, inputs, outputs, args, mnemonic, description)
  return outputs

def _es5_conversion(ctx, inputs, config):
  out_dir = ""
  return _babel_conversion(ctx, inputs, config, out_dir, "JsCompile", "Babel")

def _collect_sources(ctx, es5_outputs):
  es5_sources = depset(es5_outputs)
  es6_sources = depset(ctx.files.srcs)
  transitive_es5_sources = depset()
  transitive_es6_sources = depset()
  for dep in ctx.attr.deps:
    if hasattr(dep, "typescript"):
        transitive_es5_sources = depset(transitive = [
            transitive_es5_sources,
            dep.typescript.transitive_es5_sources,
        ])
        transitive_es6_sources = depset(transitive = [
            transitive_es6_sources,
            dep.typescript.transitive_es6_sources,
        ])

  return struct(
    es5_sources = es5_sources,
    transitive_es5_sources = depset(transitive = [transitive_es5_sources, es5_sources]),
    es6_sources = es6_sources,
    transitive_es6_sources = depset(transitive = [transitive_es6_sources, es6_sources])
  )


def _babel_library(ctx):
  if ctx.attr.babelrc:
    config = ctx.file.babelrc
  else:
    config = _write_config(ctx)

  inputs = ctx.files.srcs + ctx.files.data + [config]

  es5_outputs = _es5_conversion(ctx, inputs, config)

  js_providers = _collect_sources(ctx, es5_outputs)

  # Return legacy providers as ts_devserver still uses legacy format
  return struct(
    typescript = struct(
      es6_sources = js_providers.es6_sources,
      transitive_es6_sources = js_providers.transitive_es6_sources,
      es5_sources = js_providers.es5_sources,
      transitive_es5_sources = js_providers.transitive_es5_sources,
    ),
    legacy_info = struct(
      files = js_providers.es5_sources,
      tags = ctx.attr.tags,
      module_name =  ctx.attr.module_name,
    ),
    providers = [
      DefaultInfo(
          files = js_providers.es5_sources,
          runfiles = ctx.runfiles(
            collect_data = True,
            collect_default = True,
          ),
      ),
      OutputGroupInfo(
          es5_sources = js_providers.es5_sources,
          es6_sources = js_providers.es6_sources,
      ),
    ],
  )

babel_library = rule(
    implementation = _babel_library,
    attrs = {
        "srcs": attr.label_list(
            doc = """JavaScript source files from the workspace.
            These can use ES2015 syntax and ES Modules (import/export)""",
            allow_files = [".js"]
        ),
        "deps": attr.label_list(
            doc = """Other rules that produce JavaScript outputs, such as `ts_library`.""",
        ),
        "data": attr.label_list(
            doc = """Other files useful for babel such as .browserslistrc""",
            allow_files = True,
        ),
        "module_name": attr.string(
            doc = """Allows to specify a custom module name for requiring, rather than having to use the relative path.""",
        ),
        "module_root": attr.string(),
        "babel": attr.label(
            executable = True,
            cfg = "host",
            default = Label(_DEFAULT_BABEL_BIN),
            allow_files = True,
        ),
        "_babelrc_tmpl": attr.label(
            allow_single_file = True,
            default = Label("//internal/babel_library:babel.rc.js")
        ),
        "babelrc": attr.label(
            allow_single_file = True,
            mandatory = False,
            default = None,
        ),
        "no_sandbox": attr.string(
          doc = """The string value of no-sandbox in the execution_requirements dict of babelification""",
          default = "0"
        ),
    },
)
