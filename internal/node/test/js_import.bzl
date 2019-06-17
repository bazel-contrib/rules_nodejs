"""Allow to test transtive depedency loading with nodejs_binary"""

load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleInfo")

def _collect_sources(ctx):
    es5_sources = depset(ctx.files.srcs)
    transitive_es5_sources = depset()
    transitive_es6_sources = depset()
    for dep in ctx.attr.deps:
        if hasattr(dep, "typescript"):
            transitive_es5_sources = depset(transitive = [
                transitive_es5_sources,
                dep.typescript.transitive_es5_sources,
            ])
            transitive_es6_sources = depset(transitive = [
                transitive_es6_sources,
                dep.typescript.transitive_es6_sources,
            ])
        elif not NodeModuleInfo in dep and hasattr(dep, "files"):
            transitive_es5_sources = depset(transitive = [
                transitive_es5_sources,
                dep.files,
            ])
            transitive_es6_sources = depset(transitive = [
                transitive_es6_sources,
                dep.files,
            ])

    return struct(
        es5_sources = es5_sources,
        transitive_es5_sources = depset(transitive = [transitive_es5_sources, es5_sources]),
        es6_sources = es5_sources,
        transitive_es6_sources = depset(transitive = [transitive_es6_sources, es5_sources]),
    )

def _js_import(ctx):
    js = _collect_sources(ctx)
    return struct(
        typescript = struct(
            es6_sources = js.es6_sources,
            transitive_es6_sources = js.transitive_es6_sources,
            es5_sources = js.es5_sources,
            transitive_es5_sources = js.transitive_es5_sources,
        ),
        legacy_info = struct(
            files = js.es5_sources,
            tags = ctx.attr.tags,
        ),
        providers = [
            DefaultInfo(files = js.es5_sources),
        ],
    )

js_import = rule(
    implementation = _js_import,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "deps": attr.label_list(allow_files = True),
    },
)
