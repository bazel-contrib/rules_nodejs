# Copyright 2020 The Bazel Authors. All rights reserved.
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

"""Contains the js_library which can be used to expose any library package.
"""

load("@build_bazel_rules_nodejs//:providers.bzl",
  "DeclarationInfo", "NpmPackageInfo", "LinkablePackageInfo", "js_module_info", "js_named_module_info",
  "JSModuleInfo", "JSNamedModuleInfo"
)

def _js_library_impl(ctx):
    direct_sources = depset(ctx.files.srcs)
    direct_named_module_sources = depset(ctx.files.named_module_srcs)
    sources_depsets = [direct_sources]
    named_module_sources_depsets = [direct_named_module_sources]

    include_npm_package_info = False
    for src in ctx.files.srcs:
        if src.is_source and src.path.startswith("external/"):
            include_npm_package_info = True
            break

    declarations = depset([
        f
        for f in ctx.files.srcs
        if (
               f.path.endswith(".d.ts") or
               # package.json may be required to resolve "typings" key
               f.path.endswith("/package.json")
           ) and
           # exclude eg. external/npm/node_modules/protobufjs/node_modules/@types/node/index.d.ts
           # these would be duplicates of the typings provided directly in another dependency.
           # also exclude all /node_modules/typescript/lib/lib.*.d.ts files as these are determined by
           # the tsconfig "lib" attribute
           len(f.path.split("/node_modules/")) < 3 and f.path.find("/node_modules/typescript/lib/lib.") == -1
    ])

    transitive_declarations_depsets = [declarations]

    for dep in ctx.attr.deps:
        if DeclarationInfo in dep:
            transitive_declarations_depsets.append(dep[DeclarationInfo].transitive_declarations)
        if NpmPackageInfo in dep:
            sources_depsets.append(dep[NpmPackageInfo].sources)
        if JSModuleInfo in dep:
            sources_depsets.append(dep[JSModuleInfo].sources)
        if JSNamedModuleInfo in dep:
            named_module_sources_depsets.append(dep[JSNamedModuleInfo].sources)

    transitive_declarations = depset(transitive = transitive_declarations_depsets)
    transitive_sources = depset(transitive = sources_depsets + named_module_sources_depsets)

    providers = [
        DefaultInfo(
            files = direct_sources,
        ),
        DeclarationInfo(
            declarations = declarations,
            transitive_declarations = transitive_declarations,
            type_blacklisted_declarations = depset([]),
        ),
        js_module_info(
            sources = direct_sources,
            deps = ctx.attr.deps,
        ),
        js_named_module_info(
            sources = direct_named_module_sources,
            deps = ctx.attr.deps,
        ),
    ]

    if ctx.attr.package_name:
        path = "/".join([p for p in [ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package] if p])
        providers.append(LinkablePackageInfo(
            package_name = ctx.attr.package_name,
            path = path,
            files = depset([
                transitive_sources,
                transitive_declarations,
            ]),
        ))

    if include_npm_package_info:
        workspace_name = ctx.label.workspace_name if ctx.label.workspace_name else ctx.workspace_name
        providers.append(NpmPackageInfo(
            direct_sources = direct_sources,
            sources = transitive_sources,
            workspace = workspace_name,
        ))

    return struct(
        typescript = struct(
            declarations = declarations,
            devmode_manifest = None,
            es5_sources = depset(),
            es6_sources = depset(),
            replay_params = None,
            transitive_declarations = transitive_declarations,
            transitive_es5_sources = depset(),
            transitive_es6_sources = depset(),
            tsickle_externs = [],
            type_blacklisted_declarations = depset(),
        ),
        providers = providers,
    )

js_library = rule(
    implementation = _js_library_impl,
    attrs = {
        "deps": attr.label_list(
            doc = "Transitive dependencies of the package",
        ),
        "named_module_srcs": attr.label_list(
            doc = "A subset of srcs that are javascript named-UMD or named-AMD for use in rules such as ts_devserver",
            allow_files = True,
        ),
        "srcs": attr.label_list(
            doc = "The list of files that comprise the package",
            allow_files = True,
        ),
        "package_name": attr.string(
            doc = """Optional package_name that this package may be imported as.""",
        ),
    },
    doc = "Defines a js library package",
)
