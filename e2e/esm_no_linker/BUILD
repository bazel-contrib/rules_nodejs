load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

nodejs_binary(
    name = "binary",
    data = [
        "@npm//typescript",
    ],
    entry_point = ":main.mjs",
    templated_args = ["--nobazel_run_linker"],
)
