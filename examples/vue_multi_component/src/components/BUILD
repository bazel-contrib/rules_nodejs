load("@npm//@vue/cli-service:index.bzl", "vue_cli_service")

filegroup(
    name = "src",
    srcs = glob(["**/**"]),
    visibility = ["//visibility:public"],
)

vue_cli_service(
    name = "HelloWorld",
    outs = ["dist"],
    args = [
        "build",
	"--target",
	"lib",
        "--dest",
        "$(@D)/dist",
        "--skip-plugins",
        "eslint",
	"src/components/HelloWorld.vue"
    ],
    data = [
	"//:conf",
        "src",
        "@npm//vue",
        "@npm//@vue/cli-plugin-babel",
        "@npm//@vue/cli-plugin-eslint",
    ],
    visibility = ["//visibility:public"],
)
