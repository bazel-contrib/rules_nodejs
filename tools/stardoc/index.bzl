"Wrap stardoc to set our repo-wide defaults"

load("@io_bazel_stardoc//stardoc:stardoc.bzl", _stardoc = "stardoc")

_PKG = "@build_bazel_rules_nodejs//tools/stardoc"

def stardoc(name, out, visibility = None, **kwargs):
    _stardoc(
        name = "_gen_" + name,
        out = name + ".tmp",
        aspect_template = _PKG + ":templates/aspect.vm",
        header_template = _PKG + ":templates/header.vm",
        func_template = _PKG + ":templates/func.vm",
        provider_template = _PKG + ":templates/provider.vm",
        rule_template = _PKG + ":templates/rule.vm",
        **kwargs
    )

    native.genrule(
        name = name,
        srcs = [name + ".tmp"],
        outs = [out],
        cmd = "./external/$(NODE_PATH) tools/stardoc/post-process-docs.js $< > $@",
        toolchains = ["@build_bazel_rules_nodejs//toolchains/node:toolchain"],
        tools = ["//tools/stardoc:post-process-docs.js", "//toolchains/node:node_bin"],
        visibility = visibility,
    )
