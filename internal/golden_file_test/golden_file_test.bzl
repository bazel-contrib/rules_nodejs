"Convenience for testing that an output matches a file"

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "nodejs_test")

def golden_file_test(name, golden, actual, **kwargs):
    """Tests an actual output against a golden output.

Use `golden_debug` if the actual output changes when DEBUG is set.
"""
    data = [golden, actual, "@npm//unidiff"]

    golden_debug = kwargs.pop("golden_debug", [])
    if golden_debug:
        data.extend([golden_debug])
    else:
        golden_debug = golden

    loc = "$(rootpath %s)"
    nodejs_test(
        name = name,
        entry_point = "@build_bazel_rules_nodejs//internal/golden_file_test:bin.js",
        templated_args = ["--verify", loc % golden, loc % golden_debug, loc % actual],
        data = data,
        **kwargs
    )

    nodejs_binary(
        name = name + ".accept",
        testonly = True,
        entry_point = "@build_bazel_rules_nodejs//internal/golden_file_test:bin.js",
        templated_args = ["--out", loc % golden, loc % golden_debug, loc % actual],
        data = data,
        **kwargs
    )
