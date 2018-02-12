def _sources_aspect_impl(target, ctx):
  result = depset()
  if hasattr(ctx.rule.attr, "deps"):
    for dep in ctx.rule.attr.deps:
      if hasattr(dep, "node_sources"):
        result += dep.node_sources
  # Note layering: until we have JS interop providers, this needs to know how to
  # get TypeScript outputs.
  if hasattr(target, "typescript"):
    result += target.typescript.es5_sources
  elif hasattr(target, "files"):
    result += target.files
  return struct(node_sources = result)

sources_aspect = aspect(
    _sources_aspect_impl,
    attr_aspects = ["deps"],
)
