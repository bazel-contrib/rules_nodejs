# Copyright 2017 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"js_library can be used to expose and share any library package."

load(
    "//:providers.bzl",
    "DeclarationInfo",
    "ExternalNpmPackageInfo",
    "JSEcmaScriptModuleInfo",
    "JSModuleInfo",
    "JSNamedModuleInfo",
    "LinkablePackageInfo",
    "declaration_info",
    "js_ecma_script_module_info",
    "js_module_info",
    "js_named_module_info",
)
load(
    "//third_party/github.com/bazelbuild/bazel-skylib:rules/private/copy_file_private.bzl",
    "copy_bash",
    "copy_cmd",
)

_ATTRS = {
    "amd_names": attr.string_dict(
        doc = """Non-public legacy API, not recommended to make new usages.
        See documentation on AmdNamesInfo""",
    ),
    "deps": attr.label_list(),
    "is_windows": attr.bool(
        doc = "Internal use only. Automatically set by macro",
        mandatory = True,
    ),
    # module_name for legacy ts_library module_mapping support
    # which is still being used in a couple of tests
    # TODO: remove once legacy module_mapping is removed
    "module_name": attr.string(
        doc = "Internal use only. It will be removed soon.",
    ),
    "named_module_srcs": attr.label_list(
        doc = """Non-public legacy API, not recommended to make new usages.
        A subset of srcs that are javascript named-UMD or
        named-AMD for use in rules such as concatjs_devserver.
        They will be copied into the package bin folder if needed.""",
        allow_files = True,
    ),
    "package_name": attr.string(
        doc = """The package name that the linker will link this js_library as.

If package_path is set, the linker will link this package under <package_path>/node_modules/<package_name>.
If package_path is not set the this will be the root node_modules of the workspace.""",
    ),
    "package_path": attr.string(
        doc = """The package path in the workspace that the linker will link this js_library to.

If package_path is set, the linker will link this package under <package_path>/node_modules/<package_name>.
If package_path is not set the this will be the root node_modules of the workspace.""",
    ),
    "srcs": attr.label_list(allow_files = True),
    "strip_prefix": attr.string(
        doc = """Path components to strip from the start of the package import path.

This path is appended to the link_root when calculating the link path.""",
        default = "",
    ),
    "link_root": attr.string(
        doc = """Path to link to from the root of the workspace.
        
If unset, the target's package name is used.""",
        default = "<package_name>",
    ),
    "source_directories": attr.bool(
        doc = """A hint that srcs have directories since this cannot be detected in the rule context.

If True, all srcs and deps should be source files so that the linker can link to the source tree.

When set, DeclarationInfo is always exported since we can't scan into directory sources for file extensions. In the future,
if we can detect that a source is a directory this can be removed.""",
    ),
}

AmdNamesInfo = provider(
    doc = "Non-public API. Provides access to the amd_names attribute of js_library",
    fields = {"names": """Mapping from require module names to global variables.
        This allows devmode JS sources to load unnamed UMD bundles from third-party libraries."""},
)

def write_amd_names_shim(actions, amd_names_shim, targets):
    """Shim AMD names for UMD bundles that were shipped anonymous.

    These are collected from our bootstrap deps (the only place global scripts should appear)

    Args:
      actions: starlark rule execution context.actions
      amd_names_shim: File where the shim is written
      targets: dependencies to be scanned for AmdNamesInfo providers
    """

    amd_names_shim_content = """// GENERATED by js_library.bzl
// Shim these global symbols which were defined by a bootstrap script
// so that they can be loaded with named require statements.
"""
    for t in targets:
        if AmdNamesInfo in t:
            for n in t[AmdNamesInfo].names.items():
                amd_names_shim_content += "define(\"%s\", function() { return %s });\n" % n
    actions.write(amd_names_shim, amd_names_shim_content)

def _link_path(ctx, link_to_bin):
    link_root = ctx.label.package if ctx.attr.link_root == "<package_name>" else ctx.attr.link_root
    if link_to_bin:
        link_path = "/".join([p for p in [ctx.bin_dir.path, ctx.label.workspace_root, link_root] if p])
    else:
        link_path = "/".join([p for p in [ctx.label.workspace_root, link_root] if p])
    if ctx.attr.strip_prefix:
        link_path += "/" + ctx.attr.strip_prefix
    return link_path

def _impl(ctx):
    input_files = ctx.files.srcs + ctx.files.named_module_srcs
    all_files = []
    typings = []
    js_files = []
    named_module_files = []

    # check for special package_name values that denote an external npm package
    external_npm_package = ctx.attr.package_name == "$node_modules$"

    # link to bin unless this is an external npm package or source_directories is True
    link_to_bin = not external_npm_package and not ctx.attr.source_directories

    output_directories = False
    for idx, f in enumerate(input_files):
        file = f

        if file.is_directory:
            output_directories = True

        # copy files into bin if needed
        if link_to_bin and file.is_source:
            dst = ctx.actions.declare_file(file.basename, sibling = file)
            if ctx.attr.is_windows:
                copy_cmd(ctx, file, dst)
            else:
                copy_bash(ctx, file, dst)

            # re-assign file to the one now copied into the bin folder
            file = dst

        # register js files
        if file.basename.endswith(".js") or file.basename.endswith(".js.map") or file.basename.endswith(".json"):
            js_files.append(file)

        # register typings
        if (
            (
                file.path.endswith(".d.ts") or
                file.path.endswith(".d.ts.map") or
                # package.json may be required to resolve "typings" key
                file.path.endswith("/package.json")
            ) and
            # exclude eg. external/npm/node_modules/protobufjs/node_modules/@types/node/index.d.ts
            # these would be duplicates of the typings provided directly in another dependency.
            # also exclude all /node_modules/typescript/lib/lib.*.d.ts files as these are determined by
            # the tsconfig "lib" attribute
            len(file.path.split("/node_modules/")) < 3 and file.path.find("/node_modules/typescript/lib/lib.") == -1
        ):
            typings.append(file)

        # ctx.files.named_module_srcs are merged after ctx.files.srcs
        if idx >= len(ctx.files.srcs):
            named_module_files.append(file)

        # every single file on bin should be added here
        all_files.append(file)

    if not external_npm_package:
        # check that at least one file falls in the link_path
        link_root = ctx.label.package if ctx.attr.link_root == "<package_name>" else ctx.attr.link_root
        link_path = "/".join([p for p in [link_root, ctx.attr.strip_prefix] if p])
        if link_path:
            link_path_contains_src = False
            for file in all_files:
                short_path = file.short_path
                if file.short_path.startswith("../"):
                    # special case for external repositories
                    short_path = "/".join(short_path.split("/")[2:])
                if short_path.startswith(link_path):
                    link_path_contains_src = True
                    break
            if len(all_files) and not link_path_contains_src:
                fail("js_library %s link path '%s' does not contain any of the provided sources" % (ctx.label, link_path))

    files_depset = depset(all_files)
    js_files_depset = depset(js_files)
    named_module_files_depset = depset(named_module_files)
    typings_depset = depset(typings)

    files_depsets = [files_depset]
    npm_sources_depsets = [files_depset]
    direct_ecma_script_module_depsets = [files_depset]
    direct_sources_depsets = [files_depset]
    direct_named_module_sources_depsets = [named_module_files_depset]
    typings_depsets = [typings_depset]
    js_files_depsets = [js_files_depset]

    for dep in ctx.attr.deps:
        if ExternalNpmPackageInfo in dep:
            npm_sources_depsets.append(dep[ExternalNpmPackageInfo].sources)
        else:
            if JSEcmaScriptModuleInfo in dep:
                direct_ecma_script_module_depsets.append(dep[JSEcmaScriptModuleInfo].direct_sources)
                direct_sources_depsets.append(dep[JSEcmaScriptModuleInfo].direct_sources)
            if JSModuleInfo in dep:
                js_files_depsets.append(dep[JSModuleInfo].direct_sources)
                direct_sources_depsets.append(dep[JSModuleInfo].direct_sources)
            if JSNamedModuleInfo in dep:
                direct_named_module_sources_depsets.append(dep[JSNamedModuleInfo].direct_sources)
                direct_sources_depsets.append(dep[JSNamedModuleInfo].direct_sources)
            if DeclarationInfo in dep:
                typings_depsets.append(dep[DeclarationInfo].declarations)
                direct_sources_depsets.append(dep[DeclarationInfo].declarations)
            if DefaultInfo in dep:
                files_depsets.append(dep[DefaultInfo].files)

    providers = [
        DefaultInfo(
            files = depset(transitive = files_depsets),
            runfiles = ctx.runfiles(
                files = all_files,
                transitive_files = depset(
                    transitive = files_depsets + typings_depsets,
                ),
            ),
        ),
        AmdNamesInfo(names = ctx.attr.amd_names),
        js_ecma_script_module_info(
            sources = depset(transitive = direct_ecma_script_module_depsets),
            deps = ctx.attr.deps,
        ),
        js_module_info(
            sources = depset(transitive = js_files_depsets),
            deps = ctx.attr.deps,
        ),
        js_named_module_info(
            sources = depset(transitive = direct_named_module_sources_depsets),
            deps = ctx.attr.deps,
        ),
    ]

    if external_npm_package:
        # special case for external npm deps
        workspace_name = ctx.label.workspace_name if ctx.label.workspace_name else ctx.workspace_name
        providers.append(ExternalNpmPackageInfo(
            direct_sources = depset(transitive = direct_sources_depsets),
            sources = depset(transitive = npm_sources_depsets),
            workspace = workspace_name,
            path = ctx.attr.package_path,
            has_directories = ctx.attr.source_directories,
        ))
    else:
        providers.append(LinkablePackageInfo(
            package_name = ctx.attr.package_name,
            package_path = ctx.attr.package_path,
            path = _link_path(ctx, link_to_bin),
            files = depset(transitive = direct_sources_depsets),
        ))

    if len(typings) or len(typings_depsets) > 1:
        # Don't provide DeclarationInfo if there are no typings to provide.
        # Improves error messaging downstream if DeclarationInfo is required.
        decls = depset(transitive = typings_depsets)
        providers.append(declaration_info(
            declarations = decls,
            deps = ctx.attr.deps,
        ))
        providers.append(OutputGroupInfo(types = decls))
    elif output_directories or ctx.attr.source_directories:
        # If there are directories in this js_library then always provide declaration_info
        # since we can't scan through files within directories
        decls = depset(transitive = files_depsets)
        providers.append(declaration_info(
            declarations = decls,
            deps = ctx.attr.deps,
        ))
        providers.append(OutputGroupInfo(types = decls))

    return providers

_js_library = rule(
    implementation = _impl,
    attrs = _ATTRS,
)

def js_library(
        name,
        srcs = [],
        package_name = None,
        package_path = "",
        deps = [],
        **kwargs):
    """Groups JavaScript code so that it can be depended on like an npm package.

    `js_library` is intended to be used internally within Bazel, such as between two libraries in your monorepo.
    This rule doesn't perform any build steps ("actions") so it is similar to a `filegroup`.
    However it provides several Bazel "Providers" for interop with other rules.

    > Compare this to `pkg_npm` which just produces a directory output, and therefore can't expose individual
    > files to downstream targets and causes a cascading re-build of all transitive dependencies when any file
    > changes. Also `pkg_npm` is intended to publish your code for external usage outside of Bazel, like
    > by publishing to npm or artifactory, while `js_library` is for internal dependencies within your repo.

    `js_library` also copies any source files into the bazel-out folder.
    This is the same behavior as the `copy_to_bin` rule.
    By copying the complete package to the output tree, we ensure that the linker (our `npm link` equivalent)
    will make your source files available in the node_modules tree where resolvers expect them.
    It also means you can have relative imports between the files
    rather than being forced to use Bazel's "Runfiles" semantics where any program might need a helper library
    to resolve files between the logical union of the source tree and the output tree.

    ### Example

    A typical example usage of `js_library` is to expose some sources with a package name:

    ```python
    ts_project(
        name = "compile_ts",
        srcs = glob(["*.ts"]),
    )

    js_library(
        name = "my_pkg",
        # Code that depends on this target can import from "@myco/mypkg"
        package_name = "@myco/mypkg",
        # Consumers might need fields like "main" or "typings"
        srcs = ["package.json"],
        # The .js and .d.ts outputs from above will be part of the package
        deps = [":compile_ts"],
    )
    ```

    > To help work with "named AMD" modules as required by `concatjs_devserver` and other Google-style "concatjs" rules,
    > `js_library` has some undocumented advanced features you can find in the source code or in our examples.
    > These should not be considered a public API and aren't subject to our usual support and semver guarantees.

    ### Outputs

    Like all Bazel rules it produces a default output by providing [DefaultInfo].
    You'll get these outputs if you include this in the `srcs` of a typical rule like `filegroup`,
    and these will be the printed result when you `bazel build //some:js_library_target`.
    The default outputs are all of:
    - [DefaultInfo] produced by targets in `deps`
    - A copy of all sources (InputArtifacts from your source tree) in the bazel-out directory

    When there are TypeScript typings files, `js_library` provides [DeclarationInfo](#declarationinfo)
    so this target can be a dependency of a TypeScript rule. This includes any `.d.ts` files in `srcs` as well
    as transitive ones from `deps`.
    It will also provide [OutputGroupInfo] with a "types" field, so you can select the typings outputs with
    `bazel build //some:js_library_target --output_groups=types` or with a `filegroup` rule using the
    [output_group] attribute.

    In order to work with the linker (similar to `npm link` for first-party monorepo deps), `js_library` provides
    [LinkablePackageInfo](#linkablepackageinfo) for use with our "linker" that makes this package importable.

    It also provides:
    - [ExternalNpmPackageInfo](#externalnpmpackageinfo) to interop with rules that expect third-party npm packages.
    - [JSModuleInfo](#jsmoduleinfo) so rules like bundlers can collect the transitive set of .js files
    - [JSNamedModuleInfo](#jsnamedmoduleinfo) for rules that expect named AMD or `goog.module` format JS

    [OutputGroupInfo]: https://docs.bazel.build/versions/master/skylark/lib/OutputGroupInfo.html
    [DefaultInfo]: https://docs.bazel.build/versions/master/skylark/lib/DefaultInfo.html
    [output_group]: https://docs.bazel.build/versions/master/be/general.html#filegroup.output_group

    Args:
        name: The name for the target
        srcs: The list of files that comprise the package
        package_name: The name it will be imported by. Should match the "name" field in the package.json file.

            If package_name == "$node_modules$" this indictates that this js_library target is one or more external npm
            packages in node_modules. This is a special case that used be covered by the internal only
            `external_npm_package` attribute. NB: '$' is an illegal character
            for npm packages names so this reserved name will not conflict with any valid package_name values

            This is used by the yarn_install & npm_install repository rules for npm dependencies installed by
            yarn & npm. When true, js_library will provide ExternalNpmPackageInfo.

            It can also be used for user-managed npm dependencies if node_modules is layed out outside of bazel.
            For example,

            ```starlark
            js_library(
                name = "node_modules",
                srcs = glob(
                    include = [
                        "node_modules/**/*.js",
                        "node_modules/**/*.d.ts",
                        "node_modules/**/*.json",
                        "node_modules/.bin/*",
                    ],
                    exclude = [
                        # Files under test & docs may contain file names that
                        # are not legal Bazel labels (e.g.,
                        # node_modules/ecstatic/test/public/中文/檔案.html)
                        "node_modules/**/test/**",
                        "node_modules/**/docs/**",
                        # Files with spaces in the name are not legal Bazel labels
                        "node_modules/**/* */**",
                        "node_modules/**/* *",
                    ],
                ),
                # Special value to provide ExternalNpmPackageInfo which is used by downstream
                # rules that use these npm dependencies
                package_name = "$node_modules$",
            )
            ```

            See `examples/user_managed_deps` for a working example of user-managed npm dependencies.
        package_path: The directory in the workspace to link to.
            If set, link this js_library to the node_modules under the package path specified.
            If unset, the default is to link to the node_modules root of the workspace.
        deps: Other targets that provide JavaScript code
        **kwargs: Other attributes
    """

    # Undocumented features
    amd_names = kwargs.pop("amd_names", {})
    module_name = kwargs.pop("module_name", None)
    named_module_srcs = kwargs.pop("named_module_srcs", [])

    if module_name:
        fail("use package_name instead of module_name in target //%s:%s" % (native.package_name(), name))
    if kwargs.pop("is_windows", None):
        fail("is_windows is set by the js_library macro and should not be set explicitly")

    _js_library(
        name = name,
        amd_names = amd_names,
        srcs = srcs,
        named_module_srcs = named_module_srcs,
        deps = deps,
        package_name = package_name,
        package_path = package_path,
        # module_name for legacy ts_library module_mapping support
        # which is still being used in a couple of tests
        # TODO: remove once legacy module_mapping is removed
        module_name = package_name if package_name != "$node_modules$" else None,
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )
