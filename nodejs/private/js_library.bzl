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
    "//nodejs:providers.bzl",
    "DeclarationInfo",
    "JSModuleInfo",
    "LinkablePackageInfo",
    "declaration_info",
    "js_module_info",
)
load(
    "//third_party/github.com/bazelbuild/bazel-skylib:rules/private/copy_file_private.bzl",
    "copy_bash",
    "copy_cmd",
)

_ATTRS = {
    "deps": attr.label_list(),
    "is_windows": attr.bool(
        doc = "Internal use only. Automatically set by macro",
        mandatory = True,
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
        doc = "Path components to strip from the start of the package import path",
        default = "",
    ),
}

def _link_path(ctx, all_files):
    link_path = "/".join([p for p in [ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package] if p])

    # Strip a prefix from the package require path
    if ctx.attr.strip_prefix:
        link_path += "/" + ctx.attr.strip_prefix

        # Check that strip_prefix contains at least one src path
        check_prefix = "/".join([p for p in [ctx.label.package, ctx.attr.strip_prefix] if p])
        prefix_contains_src = False
        for file in all_files:
            if file.short_path.startswith(check_prefix):
                prefix_contains_src = True
                break
        if not prefix_contains_src:
            fail("js_library %s strip_prefix path does not contain any of the provided sources" % ctx.label)

    return link_path

def _impl(ctx):
    input_files = ctx.files.srcs[:]
    all_files = []
    typings = []
    js_files = []

    for idx, f in enumerate(input_files):
        file = f

        # copy files into bin if needed
        if file.is_source and not file.path.startswith("external/"):
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

        # every single file on bin should be added here
        all_files.append(file)

    files_depset = depset(all_files)
    js_files_depset = depset(js_files)
    typings_depset = depset(typings)

    files_depsets = [files_depset]
    npm_sources_depsets = [files_depset]
    direct_sources_depsets = [files_depset]
    typings_depsets = [typings_depset]
    js_files_depsets = [js_files_depset]

    for dep in ctx.attr.deps:
        if JSModuleInfo in dep:
            js_files_depsets.append(dep[JSModuleInfo].direct_sources)
            direct_sources_depsets.append(dep[JSModuleInfo].direct_sources)
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
        js_module_info(
            sources = depset(transitive = js_files_depsets),
            deps = ctx.attr.deps,
        ),
    ]

    providers.append(LinkablePackageInfo(
        package_name = ctx.attr.package_name,
        package_path = ctx.attr.package_path,
        path = _link_path(ctx, all_files),
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
    elif ctx.attr.package_name == "$node_modules_dir$":
        # If this is directory artifacts npm package then always provide declaration_info
        # since we can't scan through files
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
    """Docs: TODO
    """

    # Undocumented features
    if kwargs.pop("is_windows", None):
        fail("is_windows is set by the js_library macro and should not be set explicitly")

    _js_library(
        name = name,
        srcs = srcs,
        deps = deps,
        package_name = package_name,
        package_path = package_path,
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )
