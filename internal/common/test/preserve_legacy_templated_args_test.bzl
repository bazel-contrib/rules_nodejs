"Unit tests for //internal/common:preserve_legacy_templated_args.bzl"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest")
load("//internal/common:preserve_legacy_templated_args.bzl", "preserve_legacy_templated_args")

def _impl(ctx):
    env = unittest.begin(ctx)

    conversions = {
        "$": "$$",
        "$$": "$$",
        "$$$$(BAR)": "$$$$(BAR)",
        "$$(": "$$(",
        "$$(BAR)": "$$(BAR)",
        "$$(rlocation foobar)": "$$(rlocation foobar)",
        "$$(rlocation foobar)$$(rlocation foobar)": "$$(rlocation foobar)$$(rlocation foobar)",
        "$(": "$(",
        "$(BAR)": "$(BAR)",
        "$(rlocation foobar)": "$$(rlocation foobar)",
        "$(rlocation foobar)$(rlocation foobar)": "$$(rlocation foobar)$$(rlocation foobar)",
        "$(rlocation! foobar)": "$(rlocation! foobar)",
        "$(rlocation! foobar)$(rlocation! foobar)": "$(rlocation! foobar)$(rlocation! foobar)",
    }

    for key in conversions:
        asserts.equals(env, "%s" % conversions[key], preserve_legacy_templated_args("%s" % key))
        asserts.equals(env, " %s " % conversions[key], preserve_legacy_templated_args(" %s " % key))
        asserts.equals(env, "%s %s" % (conversions[key], conversions[key]), preserve_legacy_templated_args("%s %s" % (key, key)))
        asserts.equals(env, " %s %s " % (conversions[key], conversions[key]), preserve_legacy_templated_args(" %s %s " % (key, key)))
        asserts.equals(env, "a%sb%sc" % (conversions[key], conversions[key]), preserve_legacy_templated_args("a%sb%sc" % (key, key)))

    return unittest.end(env)

preserve_legacy_templated_args_test = unittest.make(
    impl = _impl,
    attrs = {},
)

def preserve_legacy_templated_args_test_suite():
    unittest.suite("preserve_legacy_templated_args_tests", preserve_legacy_templated_args_test)
