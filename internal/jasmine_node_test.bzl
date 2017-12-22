"""TODO(alexeagle)

"""

load("//internal:node.bzl", "nodejs_test")
load("//internal:devmode_js_sources.bzl", "devmode_js_sources")

def jasmine_node_test(name, srcs = [], data = [], deps = [], **kwargs):
  """TODO(alexeagle)

  """
  devmode_js_sources(
      name = "%s_devmode_srcs" % name,
      deps = srcs + deps,
      testonly = 1,
  )

  all_data = data + srcs + deps
  all_data += [Label("//internal:jasmine_runner.js")]
  all_data += [":%s_devmode_srcs.MF" % name]
  entry_point = "build_bazel_rules_nodejs/internal/jasmine_runner.js"

  nodejs_test(
      name = name,
      data = all_data,
      entry_point = entry_point,
      templated_args = ["$(location :%s_devmode_srcs.MF)" % name],
      testonly = 1,
      **kwargs
  )
