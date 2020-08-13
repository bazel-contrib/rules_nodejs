"Wrap stardoc to set our repo-wide defaults"

load("@io_bazel_stardoc//stardoc:stardoc.bzl", _stardoc = "stardoc")
load("//tools/stardoc:jekyll.bzl", _rules_nodejs_docs = "rules_nodejs_docs")

rules_nodejs_docs = _rules_nodejs_docs

_PKG = "@build_bazel_rules_nodejs//tools/stardoc"

def stardoc(**kwargs):
    _stardoc(
        aspect_template = _PKG + ":templates/aspect.vm",
        header_template = _PKG + ":templates/header.vm",
        func_template = _PKG + ":templates/func.vm",
        provider_template = _PKG + ":templates/provider.vm",
        rule_template = _PKG + ":templates/rule.vm",
        **kwargs
    )
