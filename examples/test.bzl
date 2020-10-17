"Define a convenience macro for examples integration testing"

load("@rules_nodejs//internal/bazel_integration_test:bazel_integration_test.bzl", "rules_nodejs_integration_test")
load("//:tools/defaults.bzl", "codeowners")

def example_integration_test(name, owners = [], **kwargs):
    "Set defaults for the bazel_integration_test common to our examples"
    dirname = name[len("examples_"):]
    native.filegroup(
        name = "_%s_sources" % name,
        srcs = native.glob(
            [
                "%s/*" % dirname,
                "%s/**/*" % dirname,
            ],
            exclude = ["%s/node_modules/**" % dirname],
        ),
    )
    if len(owners):
        codeowners(
            name = "OWNERS." + name,
            teams = owners,
            pattern = dirname + "/**",
        )
    rules_nodejs_integration_test(
        name = name,
        tags = kwargs.pop("tags", []) + ["examples"],
        workspace_files = kwargs.pop("workspace_files", "_%s_sources" % name),
        **kwargs
    )
