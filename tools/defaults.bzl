"""Wrappers around build rules

These set common default attributes and behaviors for our local repo
"""

load(
    "@build_bazel_rules_nodejs//:index.bzl",
    _COMMON_REPLACEMENTS = "COMMON_REPLACEMENTS",
    _nodejs_test = "nodejs_test",
    _npm_package = "npm_package",
)

nodejs_test = _nodejs_test

def npm_package(**kwargs):
    "Set some defaults for the npm_package rule"

    # Every package should have a copy of the root LICENSE file
    native.genrule(
        name = "copy_LICENSE",
        srcs = ["@build_bazel_rules_nodejs//:LICENSE"],
        outs = ["LICENSE"],
        cmd = "cp $< $@",
    )

    deps = kwargs.pop("deps", [])
    deps.append(":copy_LICENSE")

    # Make every package visible to tests
    visibility = kwargs.pop("visibility", [
        "//e2e:__pkg__",
        "//examples:__pkg__",
    ])

    # Default replacements to scrub things like skylib references
    replacements = kwargs.pop("replacements", _COMMON_REPLACEMENTS)

    # Finally call through to the rule with our defaults set
    _npm_package(
        deps = deps,
        replacements = replacements,
        visibility = visibility,
        **kwargs
    )
