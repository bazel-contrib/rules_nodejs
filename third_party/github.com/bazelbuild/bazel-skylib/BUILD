load("@bazel_skylib//:bzl_library.bzl", "bzl_library")

licenses(["notice"])

filegroup(
    name = "package_contents",
    srcs = glob(["**"]),
    visibility = ["//:__pkg__"],
)

bzl_library(
    name = "bzl",
    srcs = glob(["lib/*.bzl"]),
    visibility = ["//visibility:public"],
    deps = [
        "//internal/npm_install:bzl",
    ],
)
