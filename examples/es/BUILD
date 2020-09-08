load("@npm//es-dev-server:index.bzl", "es_dev_server")
load("//:index.bzl", "es_build")

exports_files(["tsconfig.json"])

es_build(
    name = "esbuild",
    out = "bundle.js",
    entry_point = "//src:index.ts",
    deps = ["//src"],
)

filegroup(
    name = "sources",
    srcs = [":esbuild"],
    output_group = "sources",
)

es_dev_server(
    name = "server",
    data = [
        "index.html",
        ":sources",
        "@npm//:node_modules",
    ],
    templated_args = [
        "--app-index $(location :index.html)",
        "--module-dirs ./external/npm/node_modules",
        "--preserve-symlinks",
        "--node-resolve",
    ],
)
