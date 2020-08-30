"""npm packaging

Note, this is intended for sharing library code with non-Bazel consumers.

If all users of your library code use Bazel, they should just add your library
to the `deps` of one of their targets.
"""

load("//:providers.bzl", "DeclarationInfo", "JSModuleInfo", "LinkablePackageInfo", "NodeContextInfo")

_DOC = """The pkg_npm rule creates a directory containing a publishable npm artifact.

Example:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")

pkg_npm(
    name = "my_package",
    srcs = ["package.json"],
    deps = [":my_typescript_lib"],
    substitutions = {"//internal/": "//"},
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

With the Bazel stamping feature, pkg_npm will replace any placeholder version in your package with the actual version control tag.
See the [stamping documentation](https://github.com/bazelbuild/rules_nodejs/blob/master/docs/index.md#stamping)

Usage:

`pkg_npm` yields three labels. Build the package directory using the default label:

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
$ bazel run @nodejs//:npm_node_repositories who
# Publishes the package
$ bazel run :my_package.publish
```

You can pass arguments to npm by escaping them from Bazel using a double-hyphen, for example:

`bazel run my_package.publish -- --tag=next`
"""

# Used in angular/angular /packages/bazel/src/ng_package/ng_package.bzl
PKG_NPM_ATTRS = {
    "deps": attr.label_list(
        doc = """Other targets which produce files that should be included in the package, such as `rollup_bundle`""",
        allow_files = True,
    ),
    "nested_packages": attr.label_list(
        doc = """Other pkg_npm rules whose content is copied into this package.""",
        allow_files = True,
    ),
    "node_context_data": attr.label(
        default = "@build_bazel_rules_nodejs//internal:node_context_data",
        providers = [NodeContextInfo],
        doc = "Internal use only",
    ),
    "package_name": attr.string(
        doc = """Optional package_name that this npm package may be imported as.""",
    ),
    "replace_with_version": attr.string(
        doc = """DEPRECATED: use substitutions instead.
        
        `replace_with_version = "my_version_placeholder"` is just syntax sugar for
        `substitutions = {"my_version_placeholder": "{BUILD_SCM_VERSION}"}`.

        Follow this deprecation at https://github.com/bazelbuild/rules_nodejs/issues/2158
        """,
        default = "0.0.0-PLACEHOLDER",
    ),
    "srcs": attr.label_list(
        doc = """Files inside this directory which are simply copied into the package.""",
        allow_files = True,
    ),
    "substitutions": attr.string_dict(
        doc = """Key-value pairs which are replaced in all the files while building the package.
        
        You can use values from the workspace status command using curly braces, for example
        `{"0.0.0-PLACEHOLDER": "{STABLE_GIT_VERSION}"}`.
        See the section on stamping in the README
        """,
    ),
    "vendor_external": attr.string_list(
        doc = """External workspaces whose contents should be vendored into this workspace.
        Avoids 'external/foo' path segments in the resulting package.""",
    ),
    "_npm_script_generator": attr.label(
        default = Label("//internal/pkg_npm:npm_script_generator"),
        cfg = "host",
        executable = True,
    ),
    "_packager": attr.label(
        default = Label("//internal/pkg_npm:packager"),
        cfg = "host",
        executable = True,
    ),
    "_run_npm_template": attr.label(
        default = Label("@nodejs//:run_npm.sh.template"),
        allow_single_file = True,
    ),
}

# Used in angular/angular /packages/bazel/src/ng_package/ng_package.bzl
PKG_NPM_OUTPUTS = {
    "pack": "%{name}.pack",
    "publish": "%{name}.publish",
}

# Takes a depset of files and returns a corresponding list of file paths without any files
# that aren't part of the specified package path. Also include files from external repositories
# that explicitly specified in the vendor_external list.
def _filter_out_external_files(ctx, files, package_path):
    result = []
    for file in files:
        # NB: package_path may be an empty string
        if file.short_path.startswith(package_path) and not file.short_path.startswith("../"):
            result.append(file.path)
        else:
            for v in ctx.attr.vendor_external:
                if file.short_path.startswith("../%s/" % v):
                    result.append(file.path)
    return result

# Used in angular/angular /packages/bazel/src/ng_package/ng_package.bzl
def create_package(ctx, deps_files, nested_packages):
    """Creates an action that produces the npm package.

    It copies srcs and deps into the artifact and produces the .pack and .publish
    scripts.

    Args:
      ctx: the skylark rule context
      deps_files: list of files to include in the package which have been
                  specified as dependencies
      nested_packages: list of TreeArtifact outputs from other actions which are
                       to be nested inside this package

    Returns:
      The tree artifact which is the publishable directory.
    """

    stamp = ctx.attr.node_context_data[NodeContextInfo].stamp

    all_files = deps_files + ctx.files.srcs

    if not stamp and len(all_files) == 1 and all_files[0].is_directory and len(ctx.files.nested_packages) == 0:
        # Special case where these is a single dep that is a directory artifact and there are no
        # source files or nested_packages; in that case we assume the package is contained within
        # that single directory and there is no work to do
        package_dir = all_files[0]

        _create_npm_scripts(ctx, package_dir)

        return package_dir

    package_dir = ctx.actions.declare_directory(ctx.label.name)
    package_path = ctx.label.package

    # List of dependency sources which are local to the package that defines the current
    # target. Also include files from external repositories that explicitly specified in
    # the vendor_external list. We only want to package deps files which are inside of the
    # current package unless explicitely specified.
    filtered_deps_sources = _filter_out_external_files(ctx, deps_files, package_path)

    # Back-compat for the replace_with_version stamping
    # see https://github.com/bazelbuild/rules_nodejs/issues/2158 for removal
    substitutions = dict(**ctx.attr.substitutions)
    if stamp and ctx.attr.replace_with_version:
        substitutions[ctx.attr.replace_with_version] = "{BUILD_SCM_VERSION}"

    args = ctx.actions.args()
    inputs = ctx.files.srcs + deps_files + nested_packages

    args.use_param_file("%s", use_always = True)
    args.add(package_dir.path)
    args.add(package_path)
    args.add_joined([s.path for s in ctx.files.srcs], join_with = ",", omit_if_empty = False)
    args.add(ctx.bin_dir.path)
    args.add(ctx.genfiles_dir.path)
    args.add_joined(filtered_deps_sources, join_with = ",", omit_if_empty = False)
    args.add_joined([p.path for p in nested_packages], join_with = ",", omit_if_empty = False)
    args.add(substitutions)

    if stamp:
        # The version_file is an undocumented attribute of the ctx that lets us read the volatile-status.txt file
        # produced by the --workspace_status_command.
        # Similarly info_file reads the stable-status.txt file.
        # That command will be executed whenever
        # this action runs, so we get the latest version info on each execution.
        # See https://github.com/bazelbuild/bazel/issues/1054
        args.add(ctx.version_file.path)
        inputs.append(ctx.version_file)
        args.add(ctx.info_file.path)
        inputs.append(ctx.info_file)
    else:
        args.add_all(["", ""])

    args.add_joined(ctx.attr.vendor_external, join_with = ",", omit_if_empty = False)

    ctx.actions.run(
        progress_message = "Assembling npm package %s" % package_dir.short_path,
        mnemonic = "AssembleNpmPackage",
        executable = ctx.executable._packager,
        inputs = inputs,
        outputs = [package_dir],
        arguments = [args],
    )

    _create_npm_scripts(ctx, package_dir)

    return package_dir

def _create_npm_scripts(ctx, package_dir):
    args = ctx.actions.args()
    args.add_all([
        package_dir.path,
        ctx.outputs.pack.path,
        ctx.outputs.publish.path,
        ctx.file._run_npm_template.path,
    ])

    ctx.actions.run(
        progress_message = "Generating npm pack & publish scripts",
        mnemonic = "GenerateNpmScripts",
        executable = ctx.executable._npm_script_generator,
        inputs = [ctx.file._run_npm_template, package_dir],
        outputs = [ctx.outputs.pack, ctx.outputs.publish],
        arguments = [args],
        # Must be run local (no sandbox) so that the pwd is the actual execroot
        # in the script which is used to generate the path in the pack & publish
        # scripts.
        execution_requirements = {"local": "1"},
    )

def _pkg_npm(ctx):
    deps_files_depsets = []

    for dep in ctx.attr.deps:
        # Collect whatever is in the "data"
        deps_files_depsets.append(dep.data_runfiles.files)

        # Only collect DefaultInfo files (not transitive)
        deps_files_depsets.append(dep.files)

        # All direct & transitive JavaScript-producing deps
        if JSModuleInfo in dep:
            deps_files_depsets.append(dep[JSModuleInfo].sources)

        # Include all transitive declerations
        if DeclarationInfo in dep:
            deps_files_depsets.append(dep[DeclarationInfo].transitive_declarations)

    # Note: to_list() should be called once per rule!
    deps_files = depset(transitive = deps_files_depsets).to_list()

    package_dir = create_package(ctx, deps_files, ctx.files.nested_packages)

    package_dir_depset = depset([package_dir])

    result = [
        DefaultInfo(
            files = package_dir_depset,
            runfiles = ctx.runfiles([package_dir]),
        ),
    ]

    if ctx.attr.package_name:
        result.append(LinkablePackageInfo(
            package_name = ctx.attr.package_name,
            path = package_dir.path,
            files = package_dir_depset,
        ))

    return result

pkg_npm = rule(
    implementation = _pkg_npm,
    attrs = PKG_NPM_ATTRS,
    doc = _DOC,
    outputs = PKG_NPM_OUTPUTS,
)
