def _mock_typescript_lib(ctx):
  es5_sources = depset()
  for s in ctx.attr.srcs:
    es5_sources += s.files
  return struct(typescript = struct(es5_sources = es5_sources))
  
# allows testing that node_jasmine_test will work with ts_library from
# rules_typescript without introducing a circular dependency
mock_typescript_lib = rule(
  implementation = _mock_typescript_lib,
  attrs = {
    "srcs": attr.label_list(allow_files = True),
  }
)
