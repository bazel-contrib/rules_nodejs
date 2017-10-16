load("//internal:node.bzl", "nodejs_test")
load("//internal:devmode_js_sources.bzl", "devmode_js_sources")

def jasmine_node_test(name, srcs, data = [], args = [], deps = [], **kwargs):
  devmode_js_sources(
      name = "%s_devmode_srcs" % name,
      deps = srcs + deps,
      testonly = 1,
      visibility = ["//visibility:public"]
  )

  context_repository = REPOSITORY_NAME.lstrip("@")
  manifest = Label("{}//{}:{}".format(
      REPOSITORY_NAME if len(REPOSITORY_NAME)>1 else "",
      PACKAGE_NAME,
      "%s_devmode_srcs.MF" % name))
  target_repository = manifest.workspace_root.split("/")[1] if manifest.workspace_root else context_repository
  is_external = target_repository != context_repository and target_repository != "build_bazel_rules_nodejs"
  # Note: REPOSITORY_NAME is something like "@angular" or "@"
  args = ["/".join([p
      for p in [".", "external" if is_external else "",
                target_repository, PACKAGE_NAME, "%s_devmode_srcs.MF" % name]
      if p
  ])] + args

  data += srcs + deps
  data += [Label("//internal:jasmine_runner.js")]
  data += [manifest]
  entry_point = "build_bazel_rules_nodejs/internal/jasmine_runner.js"

  nodejs_test(
      name = name,
      data = data,
      entry_point = entry_point,
      args = args,
      testonly = 1,
      **kwargs
  )
