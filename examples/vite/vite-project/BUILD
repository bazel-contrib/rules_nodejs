load(
    "@build_bazel_rules_nodejs//packages/vite:index.bzl",
    "vite",
    "vite_dev",
)
load("@npm//history-server:index.bzl", "history_server")

vite(
    name = "prod",
    srcs = glob(["src/**"]) + [
        ":index.html",
        ":package.json",
        ":vite.config.ts",
        ":yarn.lock",
        ":tsconfig.json",
    ],
    deps = [
        "@npm//@types/react",
        "@npm//@types/react-dom",
        "@npm//@vitejs/plugin-react",
        "@npm//react",
        "@npm//react-dom",
        "@npm//typescript",
        "@npm//vite",
    ],
)

vite_dev(
    name = "dev",
    srcs = glob(["src/**"]) + [
        ":index.html",
        ":package.json",
        ":vite.config.mjs",
        ":yarn.lock",
        ":tsconfig.json",
    ],
    deps = [
        "@npm//@types/react",
        "@npm//@types/react-dom",
        "@npm//@vitejs/plugin-react",
        "@npm//react",
        "@npm//react-dom",
        "@npm//typescript",
        "@npm//vite",
    ],
)

PROD_BUNDLE = ":prod"

history_server(
    name = "prodserver",
    data = [PROD_BUNDLE],
    templated_args = ["-a $$(rlocation $(rootpath %s))" % PROD_BUNDLE],
)
