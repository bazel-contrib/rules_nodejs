"""Example package for generating stardoc from rules_nodejs at source"""

load("@build_bazel_rules_nodejs//packages/typescript:index.bzl", "ts_project")

def custom_ts_project(name, **kwargs):
    """
    Helper wrapper around ts_project adding default attributes and dependencies

    Args:
        name: The name that should be given the this rule
        **kwargs: All other attrs are passed to ts_project
    """

    ts_project(
        name = name,
        tsconfig = "tsconfig.json",
        deps = kwargs.pop("deps", []) + [
            "@npm//tsutils",
            "@npm//@types/node",
        ],
        validate = False,
        **kwargs
    )
