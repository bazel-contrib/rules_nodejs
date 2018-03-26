"""npm packaging

Note, this is intended for sharing library code with non-Bazel consumers.

If all users of your library code use Bazel, they should just add your library
to the `deps` of one of their targets.
"""

load("//internal:node.bzl", "sources_aspect")

def create_package(ctx, devmode_sources, nested_packages):
  """Creates an action that produces the npm package.

  It copies srcs and deps into the artifact and produces the .pack and .publish
  scripts.

  Args:
    ctx: the skylark rule context
    devmode_sources: the .js files which belong in the package
    nested_packages: list of TreeArtifact outputs from other actions which are
                     to be nested inside this package

  Returns:
    The tree artifact which is the publishable directory.
  """

  package_dir = ctx.actions.declare_directory(ctx.label.name)

  args = ctx.actions.args()
  args.use_param_file("%s", use_always = True)
  args.add(package_dir.path)
  args.add(ctx.label.package)
  args.add([s.path for s in ctx.files.srcs], join_with=",")
  args.add(ctx.bin_dir.path)
  args.add(ctx.genfiles_dir.path)
  args.add([s.path for s in devmode_sources], join_with=",")
  args.add([p.path for p in nested_packages], join_with=",")
  args.add(ctx.attr.replacements)
  args.add([ctx.outputs.pack.path, ctx.outputs.publish.path])
  args.add(ctx.version_file.path if ctx.version_file else '')

  inputs = ctx.files.srcs + devmode_sources + nested_packages + [ctx.file._run_npm_template]
  # The version_file is an undocumented attribute of the ctx that lets us read the volatile-status.txt file
  # produced by the --workspace_status_command. That command will be executed whenever
  # this action runs, so we get the latest version info on each execution.
  # See https://github.com/bazelbuild/bazel/issues/1054
  if ctx.version_file:
    inputs.append(ctx.version_file)

  ctx.action(
      executable = ctx.executable._packager,
      inputs = inputs,
      outputs = [package_dir, ctx.outputs.pack, ctx.outputs.publish],
      arguments = [args],
  )
  return package_dir

def _npm_package(ctx):
  files = depset()
  for d in ctx.attr.deps:
    files = depset(transitive = [files, d.files, d.node_sources])

  package_dir = create_package(ctx, files.to_list(), ctx.files.packages)

  return [DefaultInfo(
      files = depset([package_dir]),
  )]

NPM_PACKAGE_ATTRS = {
    "srcs": attr.label_list(
        doc = """Files inside this directory which are simply copied into the package.""",
        allow_files = True),
    "deps": attr.label_list(
        doc = """Other targets which produce files that should be included in the package, such as `rollup_bundle`""",
        aspects = [sources_aspect]),
    "packages": attr.label_list(
        doc = """Other npm_package rules whose content is copied into this package.""",
        allow_files = True),
    "replacements": attr.string_dict(
        doc = """Key-value pairs which are replaced in all the files while building the package.
        Note that the special value 0.0.0-PLACEHOLDER is always replaced with the version stamp data.
        See the section on stamping in the README.
        """),
    "_packager": attr.label(
        default = Label("//internal/npm_package:packager"),
        cfg = "host", executable = True),
    "_run_npm_template": attr.label(
        default = Label("@nodejs//:run_npm.sh.template"),
        allow_single_file = True),
}

NPM_PACKAGE_OUTPUTS = {
  "pack": "%{name}.pack",
  "publish": "%{name}.publish",
}

npm_package = rule(
    implementation = _npm_package,
    attrs = NPM_PACKAGE_ATTRS,
    outputs = NPM_PACKAGE_OUTPUTS,
)
"""
The npm_package rule creates a directory containing a publishable npm artifact.

Load it with
`load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")`

The default output is a directory containing the package contents.

It also produces two named outputs, `[name].pack` and `[name].publish`. These can be used with `bazel run`.

For an `npm_package` rule named `my_package`, you can use

- `bazel run :my_package:pack` to create a .tgz of the package which will be written to the current working directory
- `bazel run :my_package.publish` to publish the package to the npm registry

Pass arguments to npm by escaping them from Bazel using a double-hyphen `bazel run my_package.publish -- --tag=next`
"""