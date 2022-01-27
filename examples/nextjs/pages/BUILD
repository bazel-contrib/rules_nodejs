load("//:defs.bzl", "ts_project")

ts_project(
    name = "_app",
    srcs = ["_app.tsx"],
    data = ["//styles:index_css"],
    visibility = ["//visibility:public"],
    deps = ["@npm//next"],
)

ts_project(
    name = "_document",
    srcs = ["_document.tsx"],
    visibility = ["//visibility:public"],
    deps = ["@npm//next"],
)

ts_project(
    name = "index",
    srcs = ["index.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        "//components:container",
        "//components:hero-post",
        "//components:intro",
        "//components:layout",
        "//components:more-stories",
        "//lib:api",
        "//lib:constants",
        "//types:post",
        "@npm//next",
    ],
)
