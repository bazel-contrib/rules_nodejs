load("//:defs.bzl", "ts_project")

ts_project(
    name = "author",
    srcs = ["author.ts"],
    visibility = ["//visibility:public"],
)

ts_project(
    name = "post",
    srcs = ["post.ts"],
    visibility = ["//visibility:public"],
    deps = [":author"],
)
