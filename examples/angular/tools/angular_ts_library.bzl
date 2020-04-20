load("@npm_bazel_typescript//:index.bzl", "ts_library")

def ng_ts_library(**kwargs):
    ts_library(
        compiler = "//tools:tsc_wrapped_with_angular",
        supports_workers = True,
        use_angular_plugin = True,
        **kwargs
    )
