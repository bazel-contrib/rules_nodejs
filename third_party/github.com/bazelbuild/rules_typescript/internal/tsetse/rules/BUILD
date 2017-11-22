licenses(["notice"])  # Apache 2.0

load("//:defs.bzl", "ts_library")

ts_library(
    name = "rules",
    srcs = [
        "check_return_value_rule.ts",
        "equals_nan_rule.ts",
    ],
    compiler = "//internal/tsc_wrapped:tsc",
    supports_workers = False,
    tsconfig = "//internal/tsetse:tsconfig.json",
    visibility = ["//internal/tsetse:__pkg__"],
    deps = [
        "//internal/tsetse:tsetse_lib",



    ],
)
