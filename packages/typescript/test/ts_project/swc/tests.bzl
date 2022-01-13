"Unit tests for starlark API of ts_project with custom transpiler"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest")
load("@rules_nodejs//nodejs:providers.bzl", "DeclarationInfo", "JSModuleInfo")

def _impl0(ctx):
    env = unittest.begin(ctx)

    decls = []
    for decl in ctx.attr.lib[DeclarationInfo].declarations.to_list():
        decls.append(decl.basename)
    asserts.equals(env, ctx.attr.expected_declarations, sorted(decls))

    return unittest.end(env)

transitive_declarations_test = unittest.make(_impl0, attrs = {
    "lib": attr.label(default = "transpile_with_swc"),
    "expected_declarations": attr.string_list(default = ["big.d.ts"]),
})

def _impl1(ctx):
    env = unittest.begin(ctx)

    js_files = []
    for js in ctx.attr.lib[JSModuleInfo].sources.to_list():
        js_files.append(js.basename)
    asserts.equals(env, ctx.attr.expected_js, sorted(js_files))

    return unittest.end(env)

transpile_with_failing_typecheck_test = unittest.make(_impl1, attrs = {
    "lib": attr.label(default = "transpile_with_typeerror"),
    "expected_js": attr.string_list(default = ["typeerror.js", "typeerror.js.map"]),
})

def _impl2(ctx):
    env = unittest.begin(ctx)

    js_files = []
    for js in ctx.attr.lib[JSModuleInfo].sources.to_list():
        js_files.append(js.basename)
    asserts.equals(env, ctx.attr.expected_js, sorted(js_files))

    return unittest.end(env)

transpile_with_dts_test = unittest.make(_impl2, attrs = {
    "lib": attr.label(default = "transpile_with_dts"),
    "expected_js": attr.string_list(default = ["index.js", "index.js.map"]),
})

def test_suite():
    unittest.suite("t0", transitive_declarations_test)
    unittest.suite("t1", transpile_with_failing_typecheck_test)
    unittest.suite("t2", transpile_with_dts_test)
