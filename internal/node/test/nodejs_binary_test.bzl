"Unit tests for node.bzl"

load("@bazel_skylib//lib:unittest.bzl", "analysistest", "asserts")
load("//internal/node:node.bzl", "NodeJSRuntimeInfo")

_DEFAULT_ATTRS = {
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
            Label("//third_party/github.com/buffer-from:contents"),
            Label("//third_party/github.com/source-map:contents"),
            Label("//third_party/github.com/source-map-support:contents"),
        ],
        allow_files = True,
    ),
    "_bash": attr.label(
      default = "@bazel_tools//tools/bash/runfiles",
      allow_single_file = True,
    )
}

def _provider_contents_test_impl(ctx):
    env = analysistest.begin(ctx)
    target_under_test = analysistest.target_under_test(env)

    # check toolchain
    asserts.equals(env, "File", type(target_under_test[NodeJSRuntimeInfo].toolchain))
    asserts.equals(env, ctx.file.node, target_under_test[NodeJSRuntimeInfo].toolchain)

    # check sources
    sources = ctx.files.sources + [ctx.file._bash]
    asserts.equals(env, "depset", type(target_under_test[NodeJSRuntimeInfo].sources))
    asserts.equals(env, sources, target_under_test[NodeJSRuntimeInfo].sources.to_list())

    # check node_modules
    asserts.equals(env, "depset", type(target_under_test[NodeJSRuntimeInfo].node_modules))
    asserts.equals(env, ctx.files.node_modules, target_under_test[NodeJSRuntimeInfo].node_modules.to_list())

    # check node_runfiles
    actions = analysistest.target_actions(env)
    loader_output = actions[0].outputs.to_list()[0]
    launcher_script_output = actions[1].outputs.to_list()[0]
    asserts.equals(env, "depset", type(target_under_test[NodeJSRuntimeInfo].node_runfiles))
    node_runfiles = sorted([loader_output, launcher_script_output, ctx.file._repository_args] + ctx.files._source_map_support_files)
    asserts.equals(env, node_runfiles, sorted(target_under_test[NodeJSRuntimeInfo].node_runfiles.to_list()))

    # check target's runfiles
    all_files = sorted([ctx.file.node, ctx.file._bash] + ctx.files.sources + ctx.files.node_modules + node_runfiles)
    asserts.equals(env, all_files, sorted(target_under_test[DefaultInfo].default_runfiles.files.to_list()))
    return analysistest.end(env)

provider_contents_test = analysistest.make(
    _provider_contents_test_impl,
    attrs = dict(_DEFAULT_ATTRS, **{
        "node_modules": attr.label_list(
            allow_files = True,
            default = [Label("@fine_grained_deps_yarn//typescript")],
        ),
        "sources": attr.label_list(
            allow_files = True,
            default = [Label("//internal/node/test:has-deps.js")],
        ),
    }),
)

transitive_provider_contents_test = analysistest.make(
    _provider_contents_test_impl,
    attrs = dict(_DEFAULT_ATTRS, **{
        "node_modules": attr.label_list(
            allow_files = True,
            default = [Label("@fine_grained_deps_yarn//typescript")],
        ),
        "sources": attr.label_list(
            allow_files = True,
            default = [
              Label("//internal/node/test:transitive-deps.js"),
              Label("//internal/node/test:has-deps.js"),
            ],
        ),
    }),
)

def test_nodejs_runtime_info_contents():
    provider_contents_test(
        name = "provider_contents_test",
        target_under_test = ":has_deps_bin",
    )

    transitive_provider_contents_test(
      name = "transitive_provider_contents_test",
      target_under_test = ":transitive_deps_bin"
    )

def nodejs_binary_test_suite():
    test_nodejs_runtime_info_contents()

    native.test_suite(
        name = "nodejs_binary_test",
        tests = [
            ":provider_contents_test",
            ":transitive_provider_contents_test",
        ],
    )
