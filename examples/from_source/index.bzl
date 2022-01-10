"""Example package for generating stardoc from rules_nodejs at source"""

load("@build_bazel_rules_nodejs//ts:ts_project.bzl", "ts_project")

def custom_ts_project(name, deps = [], **kwargs):
    """
    Helper wrapper around ts_project adding default attributes and dependencies

    Args:
        name: The name that should be given the this rule
        deps: A list of dependencies for this rule
        kwargs: All other attrs are passed to ts_project
    """

    ts_project(
        name = name,
        tsconfig = "tsconfig.json",
        deps = [
            "@npm//tsutils",
            "@npm//@types/node",
        ] + deps,
        validate = False,
        **kwargs
    )
