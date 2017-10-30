load(":node.bzl", "sources_aspect", "expand_path_into_runfiles")

def _devmode_js_sources_impl(ctx):
  files = depset()

  for d in ctx.attr.deps:
    if hasattr(d, "node_sources"):
      files += d.node_sources
    elif hasattr(d, "files"):
      files += d.files

  ctx.actions.write(ctx.outputs.manifest, "".join([
    expand_path_into_runfiles(ctx, f.path) + "\n" for f in files
  ]))
  return [DefaultInfo(files = files)]

devmode_js_sources = rule(
    implementation = _devmode_js_sources_impl,
    attrs = {
        "deps": attr.label_list(
            allow_files = True,
            aspects = [sources_aspect],
          ),
    },
    outputs = {
        "manifest": "%{name}.MF",
    }
)
