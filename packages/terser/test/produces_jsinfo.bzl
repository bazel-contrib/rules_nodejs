"Mock for testing terser interop"

load("@build_bazel_rules_nodejs//:providers.bzl", "JSModuleInfo")

def _produces_jsinfo(ctx):
    named_js = ctx.actions.declare_file(ctx.name + ".js")
    esnext_js = ctx.actions.declare_file(ctx.name + ".mjs")
    ctx.actions.write(named_js, """
    (function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("some_module_name", ["require", "exports", "./dep"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const dep = require("./dep");
});
""")

    ctx.actions.write(esnext_js, """import * as dep from './dep';""")

    return [
        JSModuleInfo(
            sources = depset(named_js),
            module_format = "umd",
        ),
    ]

produces_jsinfo = rule(_produces_jsinfo)
