"Define a convenience macro for examples integration testing"

load("@build_bazel_rules_nodejs//internal/bazel_integration_test:bazel_integration_test.bzl", "rules_nodejs_integration_test")

def example_integration_test(**kwargs):
    "Set defaults for the bazel_integration_test common to our examples"
    tags = kwargs.pop("tags", []) + ["examples"]
    rules_nodejs_integration_test(tags = tags, **kwargs)
