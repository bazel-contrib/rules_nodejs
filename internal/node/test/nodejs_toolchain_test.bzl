"Unit tests for node.bzl toolchain support"

load("@bazel_skylib//lib:unittest.bzl", "analysistest", "asserts")

def _runfiles_contents_test_impl(ctx):
    env = analysistest.begin(ctx)
    target_under_test = analysistest.target_under_test(env)

    # check target's runfiles
    runfiles = sorted(target_under_test[DefaultInfo].default_runfiles.files.to_list())
    asserts.true(env, ctx.file.node_selected in runfiles)
    asserts.false(env, ctx.files.node_other[0] in runfiles)
    asserts.false(env, ctx.files.node_other[1] in runfiles)

    return analysistest.end(env)

linux_platform_toolchain_test = analysistest.make(
    _runfiles_contents_test_impl,
    config_settings = {
        "//command_line_option:platforms": "@build_bazel_rules_nodejs//toolchains/node:linux_amd64",
    },
    attrs = {
        "node_selected": attr.label(
            default = Label("@nodejs_linux_amd64//:node_bin"),
            allow_single_file = True,
        ),
        "node_other": attr.label_list(
            default = [Label("@nodejs_windows_amd64//:node_bin"), Label("@nodejs_darwin_amd64//:node_bin")],
            allow_files = True,
        ),
    },
)

windows_platform_toolchain_test = analysistest.make(
    _runfiles_contents_test_impl,
    config_settings = {
        "//command_line_option:platforms": "@build_bazel_rules_nodejs//toolchains/node:windows_amd64",
    },
    attrs = {
        "node_selected": attr.label(
            default = Label("@nodejs_windows_amd64//:node_bin"),
            allow_single_file = True,
        ),
        "node_other": attr.label_list(
            default = [Label("@nodejs_linux_amd64//:node_bin"), Label("@nodejs_darwin_amd64//:node_bin")],
            allow_files = True,
        ),
    },
)

darwin_platform_toolchain_test = analysistest.make(
    _runfiles_contents_test_impl,
    config_settings = {
        "//command_line_option:platforms": "@build_bazel_rules_nodejs//toolchains/node:darwin_amd64",
    },
    attrs = {
        "node_selected": attr.label(
            default = Label("@nodejs_darwin_amd64//:node_bin"),
            allow_single_file = True,
        ),
        "node_other": attr.label_list(
            default = [Label("@nodejs_windows_amd64//:node_bin"), Label("@nodejs_linux_amd64//:node_bin")],
            allow_files = True,
        ),
    },
)

def test_runfiles_contents():
    linux_platform_toolchain_test(
        name = "linux_platform_toolchain_test",
        target_under_test = ":no_deps",
    )

    windows_platform_toolchain_test(
        name = "windows_platform_toolchain_test",
        target_under_test = ":no_deps",
    )

    darwin_platform_toolchain_test(
        name = "darwin_platform_toolchain_test",
        target_under_test = ":no_deps",
    )


def nodejs_binary_test_suite():
    test_runfiles_contents()

    native.test_suite(
        name = "nodejs_toolchain_test",
        tests = [
            ":linux_platform_toolchain_test",
            ":windows_platform_toolchain_test",
            ":darwin_platform_toolchain_test",
        ],
    )
