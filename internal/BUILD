package(default_visibility = ["//visibility:public"])
load(":node.bzl", "node_binary")

node_binary(
    name = "tsc_wrapped",
    # TODO: plug in tsc_wrapped.js instead
    main = "yarn/node_modules/typescript/lib/tsc.js",
    data = ["@yarn//node_modules"]
)