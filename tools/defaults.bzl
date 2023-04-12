"""Wrappers around build rules

These set common default attributes and behaviors for our local repo
"""

load("@rules_codeowners//tools:codeowners.bzl", _codeowners = "codeowners")

_GLOBAL_OWNERS = [
    "@alexeagle",
    "@gregmagolan",
    "@mattem",
    "@jbedard",
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
