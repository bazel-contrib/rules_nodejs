
"""js_library allows defining a set of javascript sources to be used with ts_devserver"""

load("@bazel_skylib//:lib.bzl", "paths")

def _js_library(ctx):

  outputs = [ctx.actions.declare_file(src.basename) for src in ctx.files.srcs]
  srcs = [src.path for src in ctx.files.srcs]

  out_dir = paths.join(ctx.bin_dir.path, paths.dirname(ctx.build_file_path))
  args = ctx.actions.args()
  args.add(["--out-dir", out_dir])
  args.add(["--config-file", "./" + ctx.file._babelrc.path])
  args.add(srcs)

  inputs = ctx.files.srcs + ctx.files.node_modules + [ctx.file._babelrc] + ctx.files._babel_node_modules

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

  # Return legacy providers as ts_devserver still uses legacy format
  return struct(
    typescript = struct(
      transitive_es6_sources = transitive_es6_sources,
    ),
    legacy_info = struct(
      files = outputs,
    ),
    providers = [
      DefaultInfo(files=depset(outputs)),
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
        "_babel_node_modules": attr.label(
            allow_files = True,
            default = Label("@build_bazel_rules_nodejs_js_library_deps//:node_modules")),
        "_babelrc": attr.label(
            allow_single_file = True,
            default = Label("//internal/js_library/v2:babel.rc.js")),
    },
)
