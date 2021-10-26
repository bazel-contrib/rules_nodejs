load("@bazel_skylib//:bzl_library.bzl", "bzl_library")
load("@build_bazel_rules_nodejs//:index.bzl", "generated_file_test", "nodejs_binary", "npm_package_bin")
load("@io_bazel_stardoc//stardoc:stardoc.bzl", "stardoc")
load("//:index.bzl", "custom_ts_project")

# thin macro around ts_project that sets some implicit dependencies
# while passing though all other attributes
# is used here to show how to generate stardoc for rules that consume rules_nodejs from source
custom_ts_project(
    name = "main",
    srcs = ["main.ts"],
)

nodejs_binary(
    name = "bin",
    data = [
        ":main",
    ],
    entry_point = ":main.ts",
)

bzl_library(
    name = "bzl",
    srcs = [
        "index.bzl",
    ],
    deps = [
        "//packages/concatjs/internal:bzl",
        "@build_bazel_rules_nodejs//packages/typescript:bzl",
    ],
)

# generation of the docs for the custom_ts_project macro used above
stardoc(
    name = "docs",
    out = "docs.md",
    input = "index.bzl",
    deps = [
        ":bzl",
    ],
)

# simple set of tests to ensure this process works as expected
npm_package_bin(
    name = "capture",
    testonly = True,
    stdout = "out",
    tool = ":bin",
)

generated_file_test(
    name = "output_test",
    src = "out.golden",
    generated = ":out",
)
