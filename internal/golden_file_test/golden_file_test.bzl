"Convenience for testing that an output matches a file"

load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary", "nodejs_test")

def golden_file_test(name, golden, actual, **kwargs):
    data = [golden, actual, "@npm//unidiff"]

    loc = "$(location %s)"
    nodejs_test(
        name = name,
        entry_point = "@build_bazel_rules_nodejs//internal/golden_file_test:bin.js",
        templated_args = ["--verify", loc % golden, loc % actual],
        data = data,
        **kwargs
    )

    nodejs_binary(
        name = name + ".accept",
        testonly = True,
        entry_point = "@build_bazel_rules_nodejs//internal/golden_file_test:bin.js",
        templated_args = ["--out", loc % golden, loc % actual],
        data = data,
        **kwargs
    )
