
"""js_library allows defining a set of javascript sources to be used with ts_devserver"""

load("@bazel_skylib//:lib.bzl", "paths")

def _write_config(ctx):
  output = ctx.actions.declare_file(paths.join(ctx.file._babelrc_tmpl.dirname, "_" + ctx.file._babelrc_tmpl.basename))
  ctx.actions.expand_template(
    output = output,
    template =  ctx.file._babelrc_tmpl,
    substitutions = {
        "TMPL_bin_dir_path": ctx.bin_dir.path,
        "TMPL_module_name": ctx.attr.module_name,
    }
  )
  return output

def _js_library(ctx):
  config = _write_config(ctx)
  outputs = [ctx.actions.declare_file(src.basename[:-3] + ".ajs") for src in ctx.files.srcs]

  out_dir = paths.join(ctx.bin_dir.path)
  args = ctx.actions.args()
  args.add(["--out-dir", out_dir])
  args.add(["--config-file", "./" + config.path])
  args.add_all(ctx.files.srcs)

  inputs = ctx.files.srcs + [config]

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
            allow_files = [".js"]
        ),
        "deps": attr.label_list(
            doc = """Other rules that produce JavaScript outputs, such as `ts_library`.""",
        ),
        "module_name": attr.string(),
        "module_root": attr.string(),
        "_babel": attr.label(
            executable = True,
            cfg="host",
            default = Label("//internal/js_library/v2:babel")
        ),
        "_babelrc_tmpl": attr.label(
            allow_single_file = True,
            default = Label("//internal/js_library/v2:babel.rc.js")
        ),
    },
)
