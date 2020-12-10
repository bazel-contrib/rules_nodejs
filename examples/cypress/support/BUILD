load("@yarn//@bazel/typescript:index.bzl", "ts_project")

package(default_visibility = ["//visibility:public"])

ts_project(
    name = "support",
    testonly = True,
    srcs = glob([
        "*.ts",
    ]),
    composite = True,
    declaration = True,
    # NOTE: You have to prefix with your own workspace name since ts_project, by default, use @yarn
    extends = "@examples_cypress//:tsconfig.json",
    tsconfig = {
        "compilerOptions": {
            "module": "ES2015",
        },
    },
    deps = [
        "@yarn//@types/node",
        "@yarn//cypress",
    ],
)
