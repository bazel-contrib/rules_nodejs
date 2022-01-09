load("//ts:ts_config.bzl", "ts_config")

exports_files(["tsconfig-base.json"])

ts_config(
    name = "tsconfig",
    src = "tsconfig-base.json",
    visibility = ["//ts/tests:__subpackages__"],
)
