"""Adapter from .d.ts files to DeclarationInfo.

Performs no actions, so it's like a fileset that can be a dep of ts_project.
"""

load("//nodejs/private/providers:declaration_info.bzl", "DeclarationInfo", "declaration_info")

def _ts_declaration_impl(ctx):
    typings = []

    for src in ctx.files.srcs:
        if src.is_directory:
            # assume a directory contains typings since we can't know that it doesn't
            typings.append(src)
        elif (
            src.path.endswith(".d.ts") or
            src.path.endswith(".d.ts.map") or
            # package.json may be required to resolve "typings" key
            src.path.endswith("/package.json")
        ):
            typings.append(src)

    typings_depsets = [depset(typings)]
    files_depsets = [depset(ctx.files.srcs)]

    for dep in ctx.attr.deps:
        if DeclarationInfo in dep:
            typings_depsets.append(dep[DeclarationInfo].declarations)
        if DefaultInfo in dep:
            files_depsets.append(dep[DefaultInfo].files)

    runfiles = ctx.runfiles(
        files = ctx.files.srcs,
        # We do not include typings_depsets in the runfiles because that would cause type-check actions to occur
        # in every development workflow.
        transitive_files = depset(transitive = files_depsets),
    )
    deps_runfiles = [d[DefaultInfo].default_runfiles for d in ctx.attr.deps]
    decls = depset(transitive = typings_depsets)

    # Perf optimization available in newer Bazel releases
    if "merge_all" in dir(runfiles):
        runfiles = runfiles.merge_all(deps_runfiles)
    else:
        for d in deps_runfiles:
            runfiles = runfiles.merge(d)

    return [
        DefaultInfo(
            files = depset(transitive = files_depsets),
            runfiles = runfiles,
        ),
        declaration_info(
            declarations = decls,
            deps = ctx.attr.deps,
        ),
        # Users can request the "types" output group to explicitly
        # cause type-checking to occur on this dependency tree.
        OutputGroupInfo(types = decls),
    ]

ts_declaration = struct(
    implementation = _ts_declaration_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "deps": attr.label_list(allow_files = True),
    },
    provides = [DeclarationInfo],
)
