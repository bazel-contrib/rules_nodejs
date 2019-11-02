"""Wrappers around build rules

These set common default attributes and behaviors for our local repo
"""

load(
    "@build_bazel_rules_nodejs//:index.bzl",
    _COMMON_REPLACEMENTS = "COMMON_REPLACEMENTS",
    _nodejs_test = "nodejs_test",
    _npm_package = "npm_package",
)
load("@rules_codeowners//tools:codeowners.bzl", _codeowners = "codeowners")

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

_GLOBAL_OWNERS = [
    "@alexeagle",
]

def codeowners(name = "OWNERS", no_parent = False, **kwargs):
    """Convenience macro to set some defaults

    Args:
        no_parent: Mimic the google3 OWNERS file which allows a .no-parent rule to avoid inheriting global approvers, see http://go/owners#noparent
        **kwargs: see codeowners rule docs
    """
    pkg = native.package_name()
    teams = [kwargs.pop("team")] if "team" in kwargs.keys() else kwargs.pop("teams", [])
    patterns = kwargs.pop("patterns") if "patterns" in kwargs.keys() else [kwargs.pop("pattern", "**")]

    if pkg.startswith("."):
        print(pkg, name)

    # Googlers: see http://go/owners#noparent
    if not no_parent:
        teams += [owner for owner in _GLOBAL_OWNERS if owner not in teams]

    _codeowners(
        name = name,
        patterns = patterns,
        teams = teams,
        visibility = ["//.github:__pkg__"],
        **kwargs
    )
