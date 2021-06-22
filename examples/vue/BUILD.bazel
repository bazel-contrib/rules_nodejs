load("@build_bazel_rules_nodejs//:index.bzl", "copy_to_bin", "nodejs_test")
load("@npm//@vue/cli-service:index.bzl", "vue_cli_service")
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")

filegroup(
    name = "conf",
    srcs = ["babel.config.js",
	    "package.json",
	    "package-lock.json",
	    ],
    visibility = ["//visibility:public"],
)

vue_cli_service(
    name = "serve",
    args = ["serve","--skip-plugins","eslint"],
    data = [
        "babel.config.js",
        ":package.json",
        "vue.config.js",
        "//src",
        "//src/components/HelloWorld:HelloWorld_npm"
    ],
)


vue_cli_service(
    name = "build",
    outs = ["dist"],
    args = [
        "build",
        "--dest",
        "$(@D)/dist",
        "--skip-plugins",
        "eslint",
    ],
    data = [
        "babel.config.js",
        "vue.config.js",
        ":package.json",
        "//src",
        "@npm//vue",
        "@npm//@vue/cli-plugin-babel",
        # Shouldn't be needed since it's in skip-plugins ?
        "@npm//@vue/cli-plugin-eslint",
        "//src/components:HelloWorld_npm"
    ],
)

copy_to_bin(
    name = "test_in_bin",
    srcs = ["smoke.test.js"],
)

# The example should have a Jest or Mocha test following the Vue instructions
# https://cli.vuejs.org/config/#unit-testing
# And probably also some e2e test that the server works.
# For now, just a trivial test to ensure we can build
nodejs_test(
    name = "test",
    data = [":build"],
    entry_point = "test_in_bin",
)
