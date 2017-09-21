def _devmode_js_sources_impl(ctx):
  files = depset()
  files += ctx.files.deps

  ctx.actions.write(ctx.outputs.manifest, "".join([
    "/".join([ctx.workspace_name, f.path]) + "\n" for f in files
  ]))
  return [DefaultInfo(files = files)]

devmode_js_sources = rule(
    implementation = _devmode_js_sources_impl,
    attrs = {
        "deps": attr.label_list(allow_files = True),
    },
    outputs = {
        "manifest": "%{name}.MF",
    }
)
