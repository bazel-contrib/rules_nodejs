"Mock transitive toolchain dependencies that are uneeded"

def mock_io_bazel_rules_closure_impl(repository_ctx):
    repository_ctx.file(
        "closure/BUILD.bazel",
        content = """\
package(default_visibility = ["//visibility:public"])

exports_files(["defs.bzl"])
""",
    )
    repository_ctx.file(
        "closure/defs.bzl",
        content = """\
"Minimal implementation to make loading phase succeed"

def noop(**kwargs):
    pass

closure_js_binary = noop
closure_js_library = noop
closure_js_test = noop
""",
    )

mock_io_bazel_rules_closure = repository_rule(
    mock_io_bazel_rules_closure_impl,
)
