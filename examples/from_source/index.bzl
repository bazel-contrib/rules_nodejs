"""Example package for generating stardoc from rules_nodejs at source"""

load("@rules_nodejs//packages/typescript:index.bzl", "ts_library")

def custom_ts_library(name, deps = [], **kwargs):
    """
    Helper wrapper around ts_library adding default attributes and dependencies

    Args:
        name: The name that should be given the this rule
        deps: A list of dependencies for this rule
        kwargs: All other attrs are passed to ts_library
    """

    ts_library(
        name = name,
        deps = [
            "@npm//tsutils",
            "@npm//@types/node",
        ] + deps,
        **kwargs
    )
