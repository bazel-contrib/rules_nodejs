"Unit tests for js_library rule"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest")

def _impl(ctx):
    env = unittest.begin(ctx)

    runfiles = []
    for r in ctx.attr.lib[DefaultInfo].default_runfiles.files.to_list():
        runfiles.append(r.basename)
    asserts.equals(env, ctx.attr.expected_runfiles, sorted(runfiles))

    return unittest.end(env)

runfiles_test = unittest.make(_impl, attrs = {
    "lib": attr.label(default = ":run_terser"),
    "expected_runfiles": attr.string_list(default = ["minified.js"]),
})

def npm_package_bin_test_suite():
    unittest.suite("runfiles", runfiles_test)
