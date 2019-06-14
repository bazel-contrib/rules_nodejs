"Unit tests for node.bzl"

load("@bazel_skylib//lib:unittest.bzl", "analysistest", "asserts")
load("@build_bazel_rules_nodejs//internal/node:node.bzl", "NodeJSRuntimeInfo", "nodejs_binary")

def _provider_contents_test_impl(ctx):
    env = analysistest.begin(ctx)
    target_under_test = analysistest.target_under_test(env)

    # check toolchain
    asserts.equals(env, "File", type(target_under_test[NodeJSRuntimeInfo].toolchain))
    asserts.equals(env, ctx.file.node, target_under_test[NodeJSRuntimeInfo].toolchain)

    # check sources
    asserts.equals(env, "depset", type(target_under_test[NodeJSRuntimeInfo].sources))
    asserts.equals(env, ctx.files.my_sources, target_under_test[NodeJSRuntimeInfo].sources.to_list())

    # check node_modules
    asserts.equals(env, "depset", type(target_under_test[NodeJSRuntimeInfo].node_modules))
    asserts.equals(env, ctx.files.node_modules, target_under_test[NodeJSRuntimeInfo].node_modules.to_list())

    # check node_runfiles
    actions = analysistest.target_actions(env)
    action_output = actions[0].outputs.to_list()[0]
    asserts.equals(env, "depset", type(target_under_test[NodeJSRuntimeInfo].node_runfiles))
    node_runfiles = [action_output, ctx.file._repository_args] + ctx.files._source_map_support_files
    asserts.equals(env, node_runfiles, target_under_test[NodeJSRuntimeInfo].node_runfiles.to_list())
    return analysistest.end(env)

provider_contents_test = analysistest.make(
    _provider_contents_test_impl,
    attrs = {
        "my_sources": attr.label_list(
            allow_files = True,
            default = [Label("//internal/node/test:has-deps.js")],
        ),
        "node_modules": attr.label_list(
            allow_files = True,
            default = [Label("@fine_grained_deps_yarn//typescript")],
        ),
        "node": attr.label(
          default = Label("@nodejs//:node_bin"),
          allow_single_file = True,
        ),
        "_repository_args": attr.label(
            default = Label("@nodejs//:bin/node_repo_args.sh"),
            allow_single_file = True,
        ),
        "_source_map_support_files": attr.label_list(
            default = [
                Label("@build_bazel_rules_nodejs//third_party/github.com/buffer-from:contents"),
                Label("@build_bazel_rules_nodejs//third_party/github.com/source-map:contents"),
                Label("@build_bazel_rules_nodejs//third_party/github.com/source-map-support:contents"),
            ],
            allow_files = True,
        ),
    },
)

def test_nodejs_runtime_info_contents():
    nodejs_binary(
        name = "nodejs_runtime_info_test",
        data = [
          ":has-deps.js",
          "@fine_grained_deps_yarn//typescript",
        ],
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
