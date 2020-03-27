"Unit tests for //internal/common:preserve_legacy_rlocation.bzl"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest")
load("//internal/common:preserve_legacy_rlocation.bzl", "preserve_legacy_rlocation")

def _impl(ctx):
    env = unittest.begin(ctx)

    conversions = {
        "$$(rlocation foobar)": "$$(rlocation foobar)",
        "$(rlocation foobar)": "$$(rlocation foobar)",
        "$(rlocation! foobar)": "$(rlocation! foobar)",
    }

    for key in conversions:
        asserts.equals(env, "%s" % conversions[key], preserve_legacy_rlocation("%s" % key))
        asserts.equals(env, " %s " % conversions[key], preserve_legacy_rlocation(" %s " % key))
        asserts.equals(env, "%s%s" % (conversions[key], conversions[key]), preserve_legacy_rlocation("%s%s" % (key, key)))
        asserts.equals(env, "%s %s" % (conversions[key], conversions[key]), preserve_legacy_rlocation("%s %s" % (key, key)))
        asserts.equals(env, " %s %s " % (conversions[key], conversions[key]), preserve_legacy_rlocation(" %s %s " % (key, key)))
        asserts.equals(env, "a%sb%sc" % (conversions[key], conversions[key]), preserve_legacy_rlocation("a%sb%sc" % (key, key)))

    return unittest.end(env)

preserve_legacy_rlocation_test = unittest.make(
    impl = _impl,
    attrs = {},
)

def preserve_legacy_rlocation_test_suite():
    unittest.suite("preserve_legacy_rlocation_tests", preserve_legacy_rlocation_test)
