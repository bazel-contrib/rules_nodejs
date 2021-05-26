"""Unit tests for json marshaling.

Note, this cannot live next to the file it tests, because that file is in
third_party bazel rules, and bazel doesn't support starlark testing yet.
"""

load("//third_party/bazel_rules/rules_typescript/internal:common/json_marshal.bzl", "json_marshal")
load("//third_party/bazel_skylib/lib:unittest.bzl", "asserts", "unittest")

def _test_impl(ctx):
    env = unittest.begin(ctx)
    asserts.equals(env, "\"abc\"", json_marshal("abc"))
    asserts.equals(env, "123", json_marshal(123))
    asserts.equals(env, "true", json_marshal(True))
    asserts.equals(env, "false", json_marshal(False))
    asserts.equals(env, "\"//a:b\"", json_marshal(Label("//a:b")))
    asserts.equals(env, "[]", json_marshal([]))
    asserts.equals(env, "{}", json_marshal({}))
    asserts.equals(env, """[1, 2, 3]""", json_marshal([1, 2, 3]))
    asserts.equals(env, """{"a": "b"}""", json_marshal({"a": "b"}))
    asserts.equals(env, """{"none": false}""", json_marshal({"none": None}))
    asserts.equals(
        env,
        """{"a": {"d": 1, "e": true, "f": ["f1", "f2"]}, "b": "val", "c": [{"g": false}]}""",
        json_marshal({"a": {"d": 1, "e": True, "f": ["f1", "f2"]}, "b": "val", "c": [{"g": False}]}),
    )

    return unittest.end(env)

_test = unittest.make(_test_impl)

def json_marshal_test_suite():
    unittest.suite("json_marshal_tests", _test)
