# Copyright 2019 The Bazel Authors. All rights reserved.
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

"""Contains the node_module_library which is used by yarn_install & npm_install.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "NpmPackageInfo", "js_module_info", "js_named_module_info")

def _node_module_library_impl(ctx):
    workspace_name = ctx.label.workspace_name if ctx.label.workspace_name else ctx.workspace_name

    direct_sources = depset(ctx.files.srcs)
    sources_depsets = [direct_sources]

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

    transitive_declarations = depset(transitive = transitive_declarations_depsets)

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
        providers = [
            DefaultInfo(
                files = direct_sources,
            ),
            NpmPackageInfo(
                direct_sources = direct_sources,
                sources = depset(transitive = sources_depsets),
                workspace = workspace_name,
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
                sources = depset(ctx.files.named_module_srcs),
                deps = ctx.attr.deps,
            ),
        ],
    )

node_module_library = rule(
    implementation = _node_module_library_impl,
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
    },
    doc = "Defines an npm package under node_modules",
)
