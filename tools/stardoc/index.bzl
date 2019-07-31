load("@io_bazel_skydoc//stardoc:stardoc.bzl", _stardoc = "stardoc")

def stardoc(**kwargs):
    _stardoc(
        aspect_template = "//tools/stardoc:templates/aspect.vm",
        header_template = "//tools/stardoc:templates/header.vm",
        func_template = "//tools/stardoc:templates/func.vm",
        provider_template = "//tools/stardoc:templates/provider.vm",
        rule_template = "//tools/stardoc:templates/rule.vm",
        **kwargs)