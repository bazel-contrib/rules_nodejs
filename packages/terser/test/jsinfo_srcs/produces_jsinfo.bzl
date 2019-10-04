"Mock for testing terser interop"

load("@build_bazel_rules_nodejs//:providers.bzl", "JSModuleInfo")

def _produces_jsinfo(ctx):
    return [
        DefaultInfo(
            files = depset(ctx.files.srcs),
        ),
        JSModuleInfo(
            sources = depset(ctx.files.srcs),
            module_format = ctx.attr.format,
        ),
    ]

produces_jsinfo = rule(_produces_jsinfo, attrs = {
    "srcs": attr.label_list(allow_files = True),
    "format": attr.string(mandatory = True),
})
