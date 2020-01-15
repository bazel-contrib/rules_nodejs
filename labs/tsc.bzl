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
"""A docstring"""

load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "JSModuleInfo", "NpmPackageInfo", "declaration_info", "js_module_info", "node_modules_aspect", "run_node")
load("//internal/common:expand_variables.bzl", "expand_variables")
load("//internal/linker:link_node_modules.bzl", "module_mappings_aspect")

_ATTRS = {
    "srcs": attr.label_list(
        allow_files = True,
        mandatory = True,
    ),
    "outs": attr.output_list(),
    "args": attr.string_list(),
    "declarations": attr.bool(
        doc = """Defaults to True since this is the more common case even if it is not default for tsc.

If tsc does not emit declarations than Bazel will give you an helpful error by default.

A default of False would lead to unintuitive downstream errors as if tsc does emit declarations they would not
end up in the output tree to be available for downstream tsc targets to consume.
        """,
        default = True,
    ),
    "module_name": attr.string(),
    "sourcemaps": attr.bool(
        doc = """Defaults to True since this is the more common case even if it is not default for tsc.

If tsc does not emit sourcemaps than Bazel will give you an helpful error by default.

A default of False would lead to unintuitive missing sourcemaps downstream as if tsc does emit sourcemaps
they would not end up in the output tree to be available for downstream targets to consume.
        """,
        default = True,
    ),
    "tool": attr.label(
        default = "@npm//typescript/bin:tsc",
        executable = True,
        cfg = "host",
    ),
    "tsconfig": attr.label(
        default = "//:tsconfig.json",
        allow_single_file = True,
    ),
    "deps": attr.label_list(
        allow_files = True,
        aspects = [module_mappings_aspect, node_modules_aspect],
    ),
}

def _basename_no_ext(f):
    return f.basename[:-len(f.extension) - 1]

def _expand_locations(ctx, s):
    # `.split(" ")` is a work-around https://github.com/bazelbuild/bazel/issues/10309
    # _expand_locations returns an array of args to support $(execpaths) expansions.
    # TODO: If the string has intentional spaces or if one or more of the expanded file
    # locations has a space in the name, we will incorrectly split it into multiple arguments
    targets = ctx.attr.deps + [ctx.attr.tsconfig]
    return ctx.expand_location(s, targets = targets).split(" ")

def _deps_inputs(ctx):
    depsets = []
    for d in ctx.attr.deps:
        # Only include DefaultInfo files from a dep if there is no DeclarationInfo. If there is a
        # DeclarationInfo then tsc will rely on the declaration files from that target.
        if not DeclarationInfo in d:
            # If dep has a JSModuleInfo provider than also include its sources
            if JSModuleInfo in d:
                depsets.append(d[JSModuleInfo].sources)

            # Include DefaultInfo files
            depsets.append(d[DefaultInfo].files)
    return depset(transitive = depsets)

def _declaration_inputs(ctx):
    depsets = []
    for d in ctx.attr.deps:
        if DeclarationInfo in d:
            depsets.append(d[DeclarationInfo].transitive_declarations)
    return depset(transitive = depsets)

def _npm_inputs(ctx):
    depsets = []
    for d in ctx.attr.deps:
        if NpmPackageInfo in d:
            depsets.append(d[NpmPackageInfo].sources)
    return depset(transitive = depsets)

def _impl(ctx):
    root_dir = "/".join([p for p in [ctx.label.workspace_root, ctx.label.package] if p])
    output_dir = "/".join([p for p in [ctx.bin_dir.path, root_dir] if p])

    js_outputs = []
    map_outputs = []
    decl_outputs = []
    for src in ctx.files.srcs:
        js_outputs.append(ctx.actions.declare_file(_basename_no_ext(src) + ".js", sibling = src))
        if ctx.attr.sourcemaps:
            map_outputs.append(ctx.actions.declare_file(_basename_no_ext(src) + ".js.map", sibling = src))
        if ctx.attr.declarations:
            decl_outputs.append(ctx.actions.declare_file(_basename_no_ext(src) + ".d.ts", sibling = src))

    args = ctx.actions.args()

    args.add_all([
        "-p",
        ctx.file.tsconfig.path,
        "--rootDir",
        root_dir,
        "--outDir",
        output_dir,
    ])

    # Expand $(locations) & "make" variables in user args and append them to generated args
    for a in ctx.attr.args:
        args.add_all([expand_variables(ctx, e, outs = ctx.attr.outs) for e in _expand_locations(ctx, a)])

    deps_inputs = _deps_inputs(ctx)
    declaration_inputs = _declaration_inputs(ctx)
    npm_inputs = _npm_inputs(ctx)
    direct_inputs = ctx.files.srcs + ctx.files.tsconfig

    run_node(
        ctx,
        executable = "tool",
        inputs = depset(direct_inputs, transitive = [deps_inputs, declaration_inputs, npm_inputs]).to_list(),
        outputs = js_outputs + map_outputs + decl_outputs + ctx.outputs.outs,
        arguments = [args],
    )

    return [
        DefaultInfo(
            files = depset(js_outputs + decl_outputs + map_outputs + ctx.outputs.outs),
        ),
        js_module_info(
            sources = depset(js_outputs + map_outputs),
            deps = ctx.attr.deps,
        ),
        declaration_info(
            declarations = depset(decl_outputs),
            deps = ctx.attr.deps,
        ),
    ]

tsc = rule(
    _impl,
    attrs = _ATTRS,
)
