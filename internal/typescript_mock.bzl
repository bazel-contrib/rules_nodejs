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

def _mock_es6_typescript_lib(ctx):
  transitive_es6_sources = depset()
  for s in ctx.attr.srcs:
    transitive_es6_sources = depset(transitive = [transitive_es6_sources, s.files])
  return struct(typescript = struct(
    es5_sources = depset(),
    transitive_es6_sources = depset(transitive_es6_sources)
  ))
  
# allows testing that rules are consuming es6_sources from a typescript
# provider.
mock_es6_typescript_lib = rule(
  implementation = _mock_es6_typescript_lib,
  attrs = {
    "srcs": attr.label_list(allow_files = True),
  }
)
