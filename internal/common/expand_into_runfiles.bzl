def expand_location_into_runfiles(ctx, path):
  """If the path has a location expansion, expand it. Otherwise return as-is.
  """
  if path.find('$(location') < 0:
    return path
  return expand_path_into_runfiles(ctx, path)

def expand_path_into_runfiles(ctx, path):
  """Given a file path that might contain a $(location) label expansion,
   provide the path to the file in runfiles.
   See https://docs.bazel.build/versions/master/skylark/lib/ctx.html#expand_location
  """
  targets = ctx.attr.data if hasattr(ctx.attr, "data") else []
  expanded = ctx.expand_location(path, targets)
  if expanded.startswith(ctx.bin_dir.path):
    expanded = expanded[len(ctx.bin_dir.path + "/"):]
  if expanded.startswith(ctx.genfiles_dir.path):
    expanded = expanded[len(ctx.genfiles_dir.path + "/"):]
  return ctx.workspace_name + "/" + expanded