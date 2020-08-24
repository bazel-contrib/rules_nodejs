load("//packages/typescript:index.bzl", "ts_config")

exports_files(["tsconfig-base.json"])

ts_config(
    name = "tsconfig",
    src = "tsconfig-base.json",
    visibility = ["//packages/typescript/test/ts_project:__subpackages__"],
)
