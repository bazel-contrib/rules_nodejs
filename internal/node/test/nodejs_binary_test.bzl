"Unit tests for node.bzl"

load("@bazel_skylib//lib:unittest.bzl", "asserts", "unittest", "analysistest")
load("@build_bazel_rules_nodejs//internal:node.bzl", "nodejs_binary", "NodeJSRuntimeInfo")

def _provider_contents_test_impl(ctx):
  env = analysistest.begin(ctx)
  target_under_test = analysistest.target_under_test(env)
  asserts.equals(env, "some value", target_under_test[NodeJSRuntimeInfo].val)
  asserts.equals(env,
      expected="some value",
      actual=target_under_test[NodeJSRuntimeInfo].val)
  return analysistest.end(env)

provider_contents_test = analysistest.make(_provider_contents_test_impl)

def test_nodejs_runtime_info_contents():
    # Rule under test.
    myrule(name = "provider_contents_subject")
    # Testing rule.
    provider_contents_test(name = "provider_contents",
                          target_under_test = ":provider_contents_subject")
    # Note the target_under_test attribute is how the test rule depends on
    # the real rule target.

def nodejs_runtime_info_test_suite():
    test_provider_contents()

    native.test_suite(
        name = "nodejs_binary_test",
        tests = [
            ":provider_contents",
        ],
  )
