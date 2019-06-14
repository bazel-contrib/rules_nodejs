"Unit tests for node.bzl"

load("@bazel_skylib//lib:unittest.bzl", "analysistest", "asserts")
load("@build_bazel_rules_nodejs//internal/node:node.bzl", "NodeJSRuntimeInfo", "nodejs_binary")

def _or(expected, expected_or, actual):
    return expected == actual or expected_or == actual

def _provider_contents_test_impl(ctx):
    env = analysistest.begin(ctx)
    target_under_test = analysistest.target_under_test(env)

    # check toolchain
    asserts.equals(env, "File", type(target_under_test[NodeJSRuntimeInfo].toolchain))
    correct_node_path = _or(
        "external/nodejs/bin/nodejs/bin/node",
        "external/nodejs/bin/nodejs/bin/node.exe",
        target_under_test[NodeJSRuntimeInfo].toolchain.path,
    )
    asserts.true(env, correct_node_path)
    asserts.equals(env, True, target_under_test[NodeJSRuntimeInfo].toolchain.is_source)
    asserts.equals(env, False, target_under_test[NodeJSRuntimeInfo].toolchain.is_directory)

    # print(dir(target_under_test))

    # check sources
    asserts.equals(env, "depset", type(target_under_test[NodeJSRuntimeInfo].sources))

    # asserts.equals(env, 1, len(target_under_test[NodeJSRuntimeInfo].sources.to_list()))
    # asserts.equals(env, target_under_test.files, target_under_test[NodeJSRuntimeInfo].sources)
    return analysistest.end(env)

provider_contents_test = analysistest.make(_provider_contents_test_impl)

def test_nodejs_runtime_info_contents():
    nodejs_binary(
        name = "nodejs_runtime_info_test",
        data = [":has-deps.js"],
        entry_point = ":has-deps.js",
    )
    provider_contents_test(
        name = "provider_contents",
        target_under_test = ":nodejs_runtime_info_test",
    )

def nodejs_binary_test_suite():
    test_nodejs_runtime_info_contents()

    native.test_suite(
        name = "nodejs_binary_test",
        tests = [
            ":provider_contents",
        ],
    )
