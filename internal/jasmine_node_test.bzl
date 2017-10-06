load("//internal:node.bzl", "nodejs_test")
load("//internal:devmode_js_sources.bzl", "devmode_js_sources")

def jasmine_node_test(name, srcs, data = [], args = [], deps = [], **kwargs):
  devmode_js_sources(
      name = "%s_devmode_srcs" % name,
      deps = srcs + deps,
      testonly = 1,
  )
  manifest = Label("//%s:%s_devmode_srcs.MF" % (PACKAGE_NAME, name))

  args = ["/".join([manifest.workspace_root.split("/")[1], manifest.package, manifest.name])] + args

  data += srcs + deps
  data += [Label("//internal:jasmine_runner.js")]
  data += [":%s_devmode_srcs.MF" % name]
  entry_point = "build_bazel_rules_nodejs/internal/jasmine_runner.js"

  nodejs_test(
      name = name,
      data = data,
      entry_point = entry_point,
      args = args,
      testonly = 1,
      **kwargs
  )
