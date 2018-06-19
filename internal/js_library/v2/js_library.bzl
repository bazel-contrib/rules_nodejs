
"""js_library allows defining a set of javascript sources to be used with ts_devserver"""

load("@bazel_skylib//:lib.bzl", "paths")

def _get_path(f):
  # filter out generated files as they are being passed in separately to babel
  if f.is_source:
    return f.path
  else:
    return None

def _declare_file(ctx, path):
    return ctx.actions.declare_file(paths.join("amd", path))

def _write_config(ctx):
  output = ctx.actions.declare_file(paths.join(ctx.file._babelrc_tmpl.dirname, "_" + ctx.file._babelrc_tmpl.basename))
  ctx.actions.expand_template(
    output = output,
    template =  ctx.file._babelrc_tmpl,
    substitutions = {
        "TMPL_bin_dir_path": ctx.bin_dir.path,
    }
  )
  return output

def _js_library(ctx):
  config = _write_config(ctx)
  # TODO: Babel has a bug currently, when you pass in a file directly it looses its path.
  # See https://github.com/babel/babel/issues/8193
  outputs = [_declare_file(ctx, src.basename) if src.is_source else _declare_file(ctx, src.short_path) for src in ctx.files.srcs]

  out_dir = paths.join(ctx.bin_dir.path, "amd")
  args = ctx.actions.args()
  args.add(["--ignore", config.path])
  args.add(["--out-dir", out_dir])
  args.add(["--config-file", "./" + config.path])
  args.add(ctx.bin_dir.path)
  args.add_all(ctx.files.srcs, map_each=_get_path)

  inputs = ctx.files.srcs + ctx.files.node_modules + [config]

  ctx.actions.run(
    executable = ctx.executable._babel,
    inputs = inputs,
    outputs = outputs,
    arguments = [args],
  )

  transitive_es6_sources = depset(ctx.files.srcs,
      transitive = [
          dep.typescript.transitive_es6_sources
          for dep in ctx.attr.deps
          if hasattr(dep, "typescript")
      ],
  )
  files = depset(outputs)

  # Return legacy providers as ts_devserver still uses legacy format
  return struct(
    typescript = struct(
      transitive_es6_sources = transitive_es6_sources,
      # TODO: Actually convert to es5
      es5_sources = files,
    ),
    legacy_info = struct(
      files = outputs,
    ),
    providers = [
      DefaultInfo(files=files),
    ]
  )

js_library = rule(
    implementation = _js_library,
    attrs = {
        "srcs": attr.label_list(
            doc = """JavaScript source files from the workspace.
            These can use ES2015 syntax and ES Modules (import/export)""",
            allow_files = [".js"]),
        "deps": attr.label_list(
            doc = """Other rules that produce JavaScript outputs, such as `ts_library`.""",),
            # aspects = [rollup_module_mappings_aspect]),
        "node_modules": attr.label(
            doc = """Dependencies from npm that provide some modules that must be resolved by babel.""",
            default = Label("@//:node_modules")),
        "_babel": attr.label(
            executable = True,
            cfg="host",
            default = Label("//internal/js_library/v2:babel")),
        "_babelrc_tmpl": attr.label(
            allow_single_file = True,
            default = Label("//internal/js_library/v2:babel.rc.js")),
    },
)
