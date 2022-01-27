load("//:defs.bzl", "js_library", "ts_project")

ts_project(
    name = "[slug]",
    srcs = ["[slug].tsx"],
    visibility = ["//visibility:public"],
    deps = [
        "//components:container",
        "//components:header",
        "//components:layout",
        "//components:post-body",
        "//components:post-header",
        "//components:post-title",
        "//lib:api",
        "//lib:constants",
        "//lib:markdownToHtml",
        "//types:post",
        "@npm//next",
    ],
)

js_library(
    name = "first-post",
    srcs = ["first-post.js"],
    visibility = ["//visibility:public"],
    deps = [
        "//components:layout",
        "@npm//next",
    ],
)
