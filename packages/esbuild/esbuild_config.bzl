"esbuild configuration file helper macro"

load("@build_bazel_rules_nodejs//:index.bzl", _js_library = "js_library")

def esbuild_config(name, config_file, srcs = [], deps = [], **kwargs):
    """Macro for an esbuild configuration file and its associated dependencies

    Args:
        name: Unique name for this rule
        config_file: The configuration file / entrypoint
        srcs: List of source files referenced by the configuration
        deps: List of dependencies required for this configuration
        **kwargs: Any other common attributes
    """

    _js_library(
        name = name,
        srcs = [config_file],
        **kwargs
    )

    _js_library(
        name = "%s_deps" % name,
        srcs = srcs,
        deps = deps,
        **kwargs
    )
