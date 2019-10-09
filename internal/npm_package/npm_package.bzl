"""npm packaging

Note, this is intended for sharing library code with non-Bazel consumers.

If all users of your library code use Bazel, they should just add your library
to the `deps` of one of their targets.
"""

load("@build_bazel_rules_nodejs//:declaration_provider.bzl", "DeclarationInfo")
load("@build_bazel_rules_nodejs//:providers.bzl", "JSNamedModuleInfo")

# Takes a depset of files and returns a corresponding list of file paths without any files
# that aren't part of the specified package path. Also include files from external repositories
# that explicitly specified in the vendor_external list.
def _filter_out_external_files(ctx, files, package_path):
    result = []
    for file in files:
        if file.short_path.startswith(package_path):
            result.append(file.path)
        else:
            for v in ctx.attr.vendor_external:
                if file.short_path.startswith("../%s/" % v):
                    result.append(file.path)
    return result

def create_package(ctx, deps_sources, nested_packages):
    """Creates an action that produces the npm package.

    It copies srcs and deps into the artifact and produces the .pack and .publish
    scripts.

    Args:
      ctx: the skylark rule context
      deps_sources: Files which have been specified as dependencies. Usually ".js" or ".d.ts"
                    generated files.
      nested_packages: list of TreeArtifact outputs from other actions which are
                       to be nested inside this package

    Returns:
      The tree artifact which is the publishable directory.
    """

    package_dir = ctx.actions.declare_directory(ctx.label.name)
    package_path = ctx.label.package

    # List of dependency sources which are local to the package that defines the current
    # target. Also include files from external repositories that explicitly specified in
    # the vendor_external list. We only want to package deps files which are inside of the
    # current package unless explicitely specified.
    filtered_deps_sources = _filter_out_external_files(ctx, deps_sources, package_path)

    args = ctx.actions.args()
    args.use_param_file("%s", use_always = True)
    args.add(package_dir.path)
    args.add(package_path)
    args.add_joined([s.path for s in ctx.files.srcs], join_with = ",", omit_if_empty = False)
    args.add(ctx.bin_dir.path)
    args.add(ctx.genfiles_dir.path)
    args.add_joined(filtered_deps_sources, join_with = ",", omit_if_empty = False)
    args.add_joined([p.path for p in nested_packages], join_with = ",", omit_if_empty = False)
    args.add(ctx.attr.replacements)
    args.add_all([ctx.outputs.pack.path, ctx.outputs.publish.path])
    args.add(ctx.attr.replace_with_version)
    args.add(ctx.version_file.path if ctx.version_file else "")
    args.add_joined(ctx.attr.vendor_external, join_with = ",", omit_if_empty = False)
    args.add("1" if ctx.attr.rename_build_files else "0")

    # require.resolve expects the path to start with the workspace name and not "external"
    run_npm_template_path = ctx.file._run_npm_template.path[len("external") + 1:] if ctx.file._run_npm_template.path.startswith("external") else ctx.file._run_npm_template.path
    args.add(run_npm_template_path)

    inputs = ctx.files.srcs + deps_sources + nested_packages + [ctx.file._run_npm_template]

    # The version_file is an undocumented attribute of the ctx that lets us read the volatile-status.txt file
    # produced by the --workspace_status_command. That command will be executed whenever
    # this action runs, so we get the latest version info on each execution.
    # See https://github.com/bazelbuild/bazel/issues/1054
    if ctx.version_file:
        inputs.append(ctx.version_file)

    ctx.actions.run(
        progress_message = "Assembling npm package %s" % package_dir.short_path,
        executable = ctx.executable._packager,
        inputs = inputs,
        outputs = [package_dir, ctx.outputs.pack, ctx.outputs.publish],
        arguments = [args],
        execution_requirements = {
            # Never schedule this action remotely because it's not computationally expensive.
            # It just copies files into a directory; it's not worth copying inputs and outputs to a remote worker.
            # Also don't run it in a sandbox, because it resolves an absolute path to the bazel-out directory
            # allowing the .pack and .publish runnables to work with no symlink_prefix
            # See https://github.com/bazelbuild/rules_nodejs/issues/187
            "local": "1",
        },
    )
    return package_dir

def _npm_package(ctx):
    sources_depsets = []

    for dep in ctx.attr.deps:
        # Collect whatever is in the "data"
        sources_depsets.append(dep.data_runfiles.files)

        # Only collect DefaultInfo files (not transitive)
        sources_depsets.append(dep.files)

        # All direct & transitive JavaScript-producing deps
        # TODO: switch to JSModuleInfo when it is available
        if JSNamedModuleInfo in dep:
            sources_depsets.append(dep[JSNamedModuleInfo].sources)

        # Include all transitive declerations
        if DeclarationInfo in dep:
            sources_depsets.append(dep[DeclarationInfo].transitive_declarations)

    sources = depset(transitive = sources_depsets)

    # Note: to_list() should be called once per rule!
    package_dir = create_package(ctx, sources.to_list(), ctx.files.packages)

    return [DefaultInfo(
        files = depset([package_dir]),
        runfiles = ctx.runfiles([package_dir]),
    )]

NPM_PACKAGE_ATTRS = {
    "srcs": attr.label_list(
        doc = """Files inside this directory which are simply copied into the package.""",
        allow_files = True,
    ),
    "packages": attr.label_list(
        doc = """Other npm_package rules whose content is copied into this package.""",
        allow_files = True,
    ),
    "rename_build_files": attr.bool(
        doc = """If set BUILD and BUILD.bazel files are prefixed with `_` in the npm package.
        The default is True since npm packages that contain BUILD files don't work with
        `yarn_install` and `npm_install` without a post-install step that deletes or renames them.""",
        default = True,
    ),
    "replace_with_version": attr.string(
        doc = """If set this value is replaced with the version stamp data.
        See the section on stamping in the README.""",
        default = "0.0.0-PLACEHOLDER",
    ),
    "replacements": attr.string_dict(
        doc = """Key-value pairs which are replaced in all the files while building the package.""",
    ),
    "vendor_external": attr.string_list(
        doc = """External workspaces whose contents should be vendored into this workspace.
        Avoids 'external/foo' path segments in the resulting package.""",
    ),
    "deps": attr.label_list(
        doc = """Other targets which produce files that should be included in the package, such as `rollup_bundle`""",
        allow_files = True,
    ),
    "_packager": attr.label(
        default = Label("//internal/npm_package:packager"),
        cfg = "host",
        executable = True,
    ),
    "_run_npm_template": attr.label(
        default = Label("@nodejs//:run_npm.sh.template"),
        allow_single_file = True,
    ),
}

NPM_PACKAGE_OUTPUTS = {
    "pack": "%{name}.pack",
    "publish": "%{name}.publish",
}

npm_package = rule(
    implementation = _npm_package,
    attrs = NPM_PACKAGE_ATTRS,
    doc = """The npm_package rule creates a directory containing a publishable npm artifact.

Example:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "npm_package")

npm_package(
    name = "my_package",
    srcs = ["package.json"],
    deps = [":my_typescript_lib"],
    replacements = {"//internal/": "//"},
)
```

You can use a pair of `// BEGIN-INTERNAL ... // END-INTERNAL` comments to mark regions of files that should be elided during publishing.
For example:

```javascript
function doThing() {
    // BEGIN-INTERNAL
    // This is a secret internal-only comment
    doInternalOnlyThing();
    // END-INTERNAL
}
```

Usage:

`npm_package` yields three labels. Build the package directory using the default label:

```sh
$ bazel build :my_package
Target //:my_package up-to-date:
  bazel-out/fastbuild/bin/my_package
$ ls -R bazel-out/fastbuild/bin/my_package
```

Dry-run of publishing to npm, calling `npm pack` (it builds the package first if needed):

```sh
$ bazel run :my_package.pack
INFO: Running command line: bazel-out/fastbuild/bin/my_package.pack
my-package-name-1.2.3.tgz
$ tar -tzf my-package-name-1.2.3.tgz
```

Actually publish the package with `npm publish` (also builds first):

```sh
# Check login credentials
$ bazel run @nodejs//:npm who
# Publishes the package
$ bazel run :my_package.publish
```

You can pass arguments to npm by escaping them from Bazel using a double-hyphen `bazel run my_package.publish -- --tag=next`
""",
    outputs = NPM_PACKAGE_OUTPUTS,
)
