"Unit tests for js_library rule"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest")
load("@rules_nodejs//nodejs:providers.bzl", "DeclarationInfo")

def _impl(ctx):
    env = unittest.begin(ctx)
    decls = []
    for decl in ctx.attr.lib[DeclarationInfo].declarations.to_list():
        decls.append(decl.basename)
    asserts.equals(env, ctx.attr.declarations, decls)
    return unittest.end(env)

transitive_declarations_test = unittest.make(_impl, attrs = {
    "declarations": attr.string_list(default = ["a.d.ts"]),
    "lib": attr.label(default = ":b"),
})

def transitive_declarations_test_suite():
    unittest.suite("transitive_declarations_tests", transitive_declarations_test)
