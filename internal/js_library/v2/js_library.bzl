
"""js_library allows defining a set of javascript sources to be used with ts_devserver"""

load("@bazel_skylib//:lib.bzl", "paths")

def _get_path(ctx, file):
  if not file.short_path.startswith(ctx.label.package):
    fail("Unable to recover a relative path: %s did not start with %s" % (file.short_path, ctx.label.package))

  path = file.short_path[len(ctx.label.package)+1:]
  return path

def _write_config(ctx):
  output = ctx.actions.declare_file(paths.join(ctx.file.babelrc_tmpl.dirname, "_" + ctx.file.babelrc_tmpl.basename))
  ctx.actions.expand_template(
    output = output,
    template =  ctx.file.babelrc_tmpl,
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
    all_other_args.append(_get_path(ctx,src))

  args.add_all(all_other_args)
  return args

def _trim(out_dir, src, trim, bin_dir_trim):
  if src.is_source:
    src_path = src.path[trim:]
  else:
    src_path = src.path[bin_dir_trim:]
  return paths.join(out_dir, src_path)

def _declare_babel_outputs(ctx, out_dir):
  trim = len(paths.join(ctx.label.workspace_root, ctx.label.package) + "/")
  bin_dir_trim = trim + len(ctx.bin_dir.path + "/")
  return [ctx.actions.declare_file(_trim(out_dir, src, trim, bin_dir_trim)) for src in ctx.files.srcs]

def _run_babel(ctx, inputs, outputs, args, mnemonic, description):
  ctx.actions.run(
    executable = ctx.executable.babel,
    inputs = inputs,
    outputs = outputs,
    arguments = [args],
    mnemonic = mnemonic,
    progress_message = "Compiling Javascript (%s) %s" % (description, ctx.label),
    executable_requirements = { "no-sandbox": ctx.attr.no_sandbox },
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


def _js_library(ctx):
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

js_library = rule(
    implementation = _js_library,
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
        "module_name": attr.string(),
        "module_root": attr.string(),
        "babel": attr.label(
            executable = True,
            cfg="host",
            default = Label("//internal/js_library/v2:babel")
        ),
        "babelrc_tmpl": attr.label(
            allow_single_file = True,
            default = Label("//internal/js_library/v2:babel.rc.js")
        ),
        "no_sandbox": attr.string(
            doc = """The string value of no-sandbox in the execution_requirements dict of babelification""",
            default = "0"
        ),
    },
)
