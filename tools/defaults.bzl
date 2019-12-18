"""Wrappers around build rules

These set common default attributes and behaviors for our local repo
"""

load(
    "@build_bazel_rules_nodejs//:index.bzl",
    _COMMON_REPLACEMENTS = "COMMON_REPLACEMENTS",
    _nodejs_test = "nodejs_test",
    _pkg_npm = "pkg_npm",
)
load("@rules_codeowners//tools:codeowners.bzl", _codeowners = "codeowners")
load("//third_party/github.com/bazelbuild/bazel-skylib:rules/copy_file.bzl", "copy_file")

nodejs_test = _nodejs_test

def pkg_npm(**kwargs):
    "Set some defaults for the pkg_npm rule"

    # Every package should have a copy of the root LICENSE file
    copy_file(
        name = "copy_LICENSE",
        src = "@build_bazel_rules_nodejs//:LICENSE",
        out = "LICENSE",
    )

    deps = [":copy_LICENSE"] + kwargs.pop("deps", [])
    build_file_content = kwargs.pop("build_file_content", None)
    if build_file_content:
        native.genrule(
            name = "generate_BUILD",
            srcs = [],
            outs = ["_BUILD.bazel"],
            cmd = """echo '%s' >$@""" % build_file_content,
        )

        # deps.append() doesn't work here with deps = select({...}) passed in
        deps = deps + [":generate_BUILD"]

    # Make every package visible to tests
    visibility = kwargs.pop("visibility", [
        "//e2e:__pkg__",
        "//examples:__pkg__",
    ])

    # Default replacements to scrub things like skylib references
    replacements = kwargs.pop("replacements", _COMMON_REPLACEMENTS)

    # Finally call through to the rule with our defaults set
    _pkg_npm(
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
