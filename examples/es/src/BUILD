load("@npm//@bazel/typescript:index.bzl", "ts_library")

exports_files(["index.ts"])

ts_library(
    name = "src",
    srcs = [
        "index.ts",
        "name.ts",
    ],
    prodmode_module = "esnext",
    visibility = ["//:__pkg__"],
    deps = [
        "@npm//detect-browser",
    ],
)
