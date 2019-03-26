load("@io_bazel_rules_sass//:defs.bzl", "sass_binary", "sass_library")

package(default_visibility = ["//visibility:public"])

sass_library(
    name = "colors",
    srcs = ["colors.scss"],
)

sass_library(
    name = "fonts",
    srcs = ["fonts.scss"],
)

sass_library(
    name = "shared",
    srcs = ["shared.scss"],
    deps = [
        ":colors",
        ":fonts",
    ],
)

sass_binary(
    name = "main",
    src = "main.scss",
    deps = [
        ":colors",
        ":fonts",
    ],
)
