"small assertion helper"

load("@bazel_skylib//rules:diff_test.bzl", "diff_test")
load("@bazel_skylib//rules:write_file.bzl", "write_file")
load("@build_bazel_rules_nodejs//:index.bzl", "npm_package_bin")

def assert_program_produces_stdout(name, tool, stdout):
    write_file(
        name = "write_expected_" + name,
        out = "expected_" + name,
        content = stdout,
    )

    npm_package_bin(
        name = "write_actual_" + name,
        tool = tool,
        stdout = "actual_" + name,
    )

    diff_test(
        name = name,
        file1 = "expected_" + name,
        file2 = "actual_" + name,
    )
