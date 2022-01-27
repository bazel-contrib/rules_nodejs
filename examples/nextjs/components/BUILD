load("//:defs.bzl", "js_library", "ts_project")

ts_project(
    name = "alert",
    srcs = ["alert.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        ":container",
        "//lib:constants",
        "@npm//classnames",
    ],
)

ts_project(
    name = "avatar",
    srcs = ["avatar.tsx"],
    visibility = ["//visibility:public"],
)

ts_project(
    name = "container",
    srcs = ["container.tsx"],
    visibility = ["//visibility:public"],
    deps = ["@npm//react"],
)

ts_project(
    name = "cover-image",
    srcs = ["cover-image.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        "@npm//classnames",
        "@npm//next",
    ],
)

ts_project(
    name = "date-formatter",
    srcs = ["date-formatter.tsx"],
    visibility = ["//visibility:public"],
    deps = ["@npm//date-fns"],
)

ts_project(
    name = "footer",
    srcs = ["footer.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        ":container",
        "//lib:constants",
    ],
)

ts_project(
    name = "header",
    srcs = ["header.tsx"],
    visibility = ["//visibility:public"],
    deps = ["@npm//next"],
)

ts_project(
    name = "hero-post",
    srcs = ["hero-post.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        ":avatar",
        ":cover-image",
        ":date-formatter",
        "//types:author",
        "@npm//next",
    ],
)

ts_project(
    name = "intro",
    srcs = ["intro.tsx"],
    visibility = ["//visibility:public"],
    deps = ["//lib:constants"],
)

js_library(
    name = "markdown-styles.module_css",
    srcs = [
        "markdown-styles.module.css",
    ],
    visibility = ["//visibility:public"],
)

ts_project(
    name = "meta",
    srcs = ["meta.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        "//lib:constants",
        "@npm//next",
    ],
)

ts_project(
    name = "more-stories",
    srcs = ["more-stories.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        ":post-preview",
        "//types:post",
    ],
)

ts_project(
    name = "post-body",
    srcs = ["post-body.tsx"],
    data = [":markdown-styles.module_css"],
    visibility = ["//visibility:public"],
)

ts_project(
    name = "post-header",
    srcs = ["post-header.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        ":avatar",
        ":cover-image",
        ":date-formatter",
        ":post-title",
        "//types:author",
    ],
)

ts_project(
    name = "post-preview",
    srcs = ["post-preview.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        ":avatar",
        ":cover-image",
        ":date-formatter",
        "//types:author",
        "@npm//next",
    ],
)

ts_project(
    name = "post-title",
    srcs = ["post-title.tsx"],
    visibility = ["//visibility:public"],
    deps = ["@npm//react"],
)

ts_project(
    name = "layout",
    srcs = ["layout.tsx"],
    visibility = ["//visibility:public"],
    deps = [
        ":alert",
        ":footer",
        ":meta",
    ],
)

ts_project(
    name = "section-separator",
    srcs = ["section-separator.tsx"],
    visibility = ["//visibility:public"],
)
