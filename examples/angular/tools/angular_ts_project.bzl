"Shows how to use ts_project(tsc=ngc) to make a drop-in replacement for ng_module/ts_library(use_angular_plugin)"

load("//tools:typescript.bzl", "ts_project")

def ng_ts_project(name, tsconfig = "//src:tsconfig", srcs = [], angular_assets = [], **kwargs):
    ts_project(
        name = name,
        tsconfig = tsconfig,
        tsc = "@npm//@angular/compiler-cli/bin:ngc",
        srcs = srcs + angular_assets,
        **kwargs
    )
