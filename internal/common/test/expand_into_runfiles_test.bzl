"Unit tests for //internal/common:expand_into_runfiles.bzl"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest")
load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")

def _impl(ctx):
    env = unittest.begin(ctx)

    conversions = {
        "$(location //:package.json)": "rules_nodejs/package.json",
        "$(location :a)": "rules_nodejs/internal/common/test/foo/bar/a.txt",
        "$(location params_file.spec.js)": "rules_nodejs/internal/common/test/params_file.spec.js",
        "$(locations :locations_in)": "rules_nodejs/package.json rules_nodejs/internal/common/test/foo/bar/a.txt rules_nodejs/internal/common/test/params_file.spec.js",
        "$(rootpath //:package.json)": "./package.json",
        "$(rootpath :a)": "internal/common/test/foo/bar/a.txt",
        "$(rootpath params_file.spec.js)": "internal/common/test/params_file.spec.js",
        "$(rootpaths :locations_in)": "./package.json internal/common/test/foo/bar/a.txt internal/common/test/params_file.spec.js",
    }

    for key in conversions:
        asserts.equals(env, "%s" % conversions[key], expand_location_into_runfiles(ctx, "%s" % key))
        asserts.equals(env, " %s " % conversions[key], expand_location_into_runfiles(ctx, " %s " % key))
        asserts.equals(env, "%s%s" % (conversions[key], conversions[key]), expand_location_into_runfiles(ctx, "%s%s" % (key, key)))
        asserts.equals(env, "%s %s" % (conversions[key], conversions[key]), expand_location_into_runfiles(ctx, "%s %s" % (key, key)))
        asserts.equals(env, " %s %s " % (conversions[key], conversions[key]), expand_location_into_runfiles(ctx, " %s %s " % (key, key)))
        asserts.equals(env, "a%sb%sc" % (conversions[key], conversions[key]), expand_location_into_runfiles(ctx, "a%sb%sc" % (key, key)))

    return unittest.end(env)

expand_into_runfiles_test = unittest.make(
    impl = _impl,
    attrs = {
        "deps": attr.label_list(default = [
            "//:package.json",
            "params_file.spec.js",
            ":a",
            ":locations_in",
        ], allow_files = True),
    },
)

def expand_into_runfiles_test_suite():
    unittest.suite("expand_into_runfiles_tests", expand_into_runfiles_test)
