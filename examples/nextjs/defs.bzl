"""Macros for defining typescript/javascript targets"""

load("@build_bazel_rules_nodejs//:index.bzl", _js = "js_library")
load("@npm//@bazel/typescript:index.bzl", _ts_project = "ts_project")
load("@aspect_rules_swc//swc:swc.bzl", "swc_rule")

_DEPS = [
    "@npm//@types/react",
    "@npm//tslib",
]

def swc(name, **kwargs):
    """Pass swcrc to swc rule."""
    kwargs["swcrc"] = "//:.swcrc"
    swc_rule(name = name, **kwargs)

def js_library(name, srcs, **kwargs):
    """Generate javascript targets. Adds flexibility for updating dependencies."""
    _js(name, srcs, **kwargs)

def ts_project(name, srcs, **kwargs):
    """Macro for generating typescript targets."""
    tsconfig = {
        "compilerOptions": {
            "allowJs": True,
            "declaration": True,
            "strict": True,
            "noImplicitAny": True,
        },
    }
    deps = kwargs.pop("deps", [])
    deps += _DEPS

    # This is needed to import CSS
    srcs.append("//:Global.d.ts")

    data = kwargs.pop("data", [])

    _ts_project(
        name = name,
        transpiler = swc,
        srcs = srcs,
        deps = deps,
        data = data,
        allow_js = True,
        declaration = True,
        declaration_map = True,
        preserve_jsx = True,
        link_workspace_root = True,
        extends = "//:tsconfig.json",
        tsconfig = tsconfig,
        **kwargs
    )
