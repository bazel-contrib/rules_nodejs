"Define a convenience macro for e2e integration testing"

load("@build_bazel_rules_nodejs//internal/bazel_integration_test:bazel_integration_test.bzl", "rules_nodejs_integration_test")

def e2e_integration_test(name, **kwargs):
    "Set defaults for the bazel_integration_test common to our e2e"
    workspace_root = kwargs.pop("workspace_root", name[len("e2e_"):])

    native.filegroup(
        name = "_%s_sources" % name,
        srcs = native.glob(
            [
                "%s/*" % workspace_root,
                "%s/**/*" % workspace_root,
            ],
            exclude = ["%s/node_modules/**" % workspace_root],
        ),
    )

    rules_nodejs_integration_test(
        name = name,
        tags = kwargs.pop("tags", []) + ["e2e"],
        workspace_files = kwargs.pop("workspace_files", "_%s_sources" % name),
        resolutions = kwargs.pop("resolutions", {"//packages/worker:npm_package": "@bazel/worker"}),
        **kwargs
    )
