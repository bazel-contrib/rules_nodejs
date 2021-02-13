"""default rules for docs"""

load("@io_bazel_rules_sass//sass:sass.bzl", _multi_sass_binary = "multi_sass_binary", _sass_library = "sass_library")
load("//packages/esbuild:index.bzl", _esbuild = "esbuild")
load("//packages/typescript:index.bzl", _ts_library = "ts_library")

def ng_module(name, deps = [], styles = [], assets = [], theme = None, theme_deps = [], **kwargs):
    """Extended ng_module abstracting building stylesheets and collecting theme files

    Args:
        name: name of the ts_library to set
        deps: Typescript deps for the Angular module
        styles: The scss file used by the module, if present
        assets: Angular assets, eg html
        theme: The scss Angular Material theme
        theme_deps: Any deps for the scss theme
        **kwargs: all other attrs passed to ts_library
    """

    if theme != None:
        _sass_library(
            name = "%s_theme" % name,
            srcs = [theme],
            deps = theme_deps,
            visibility = ["//docs-site/src:__subpackages__"],
        )

    angular_assets = assets

    if len(styles) > 0:
        _multi_sass_binary(
            name = "%s_styles" % name,
            srcs = styles,
        )
        angular_assets = angular_assets + ["%s_styles" % name]

    visibility = kwargs.pop("visibiltiy", ["//docs-site/src:__subpackages__"])
    ts_library(
        name = name,
        compiler = "//docs-site/tools:tsc_wrapped_with_angular",
        use_angular_plugin = True,
        supports_workers = True,
        angular_assets = angular_assets,
        deps = [
            "@npm//@angular/common",
            "@npm//@angular/core",
            "@npm//rxjs",
        ] + deps,
        visibility = visibility,
        **kwargs
    )

def esbuild(**kwargs):
    _esbuild(
        tool = select({
            "@bazel_tools//src/conditions:darwin": "@esbuild_darwin//:bin/esbuild",
            "@bazel_tools//src/conditions:linux_x86_64": "@esbuild_linux//:bin/esbuild",
            "@bazel_tools//src/conditions:windows": "@esbuild_windows//:esbuild.exe",
        }),
        **kwargs
    )

def ts_library(**kwargs):
    _ts_library(
        tsconfig = "//docs-site:tsconfig",
        **kwargs
    )
