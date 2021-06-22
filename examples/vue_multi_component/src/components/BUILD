load("@npm//@vue/cli-service:index.bzl", "vue_cli_service")
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")

filegroup(
    name = "src",
    srcs = glob(["**/**"]),
    visibility = ["//visibility:public"],
)

pkg_npm(
    name = "HelloWorld_npm",
    package_name = "HelloWorld",
    srcs = ["package.json"],
    deps = ["//src/components:HelloWorld"],
    substitutions = {"//src/": "//"},
    visibility = ["//visibility:public"],
)

      

vue_cli_service(
    name = "HelloWorld",
    outs = ["dist"],
    args = [
        "build",
        "--name",
        "HelloWorld",
	      "--target",
	      "lib",
        "--dest",
        "$(@D)/dist",
        "--skip-plugins",
        "eslint",
	      "src/components/HelloWorld.vue"
    ],
    data = [
        "package.json",
	      #"//:conf",
        "src",
        "@npm//vue",
        "@npm//@vue/cli-plugin-babel",
        "@npm//@vue/cli-plugin-eslint",
    ],
    visibility = ["//visibility:public"],
)
