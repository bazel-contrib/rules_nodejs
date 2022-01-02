"Unit tests for js_library rule"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest")
load("//:providers.bzl", "DeclarationInfo")

def _impl(ctx):
    env = unittest.begin(ctx)

    decls = []
    for decl in ctx.attr.lib[DeclarationInfo].declarations.to_list():
        decls.append(decl.basename)
    asserts.equals(env, ctx.attr.expected_declarations, sorted(decls))

    runfiles = []
    for r in ctx.attr.lib[DefaultInfo].default_runfiles.files.to_list():
        runfiles.append(r.basename)
    asserts.equals(env, ctx.attr.expected_runfiles, sorted(runfiles))

    return unittest.end(env)

transitive_declarations_test = unittest.make(_impl, attrs = {
    "expected_declarations": attr.string_list(default = ["a.d.ts"]),
    "lib": attr.label(default = ":terminal"),
    "expected_runfiles": attr.string_list(default = ["a.d.ts", "b.js", "c.d.ts", "c.txt"]),
})

def transitive_declarations_test_suite():
    unittest.suite("transitive_declarations_tests", transitive_declarations_test)
