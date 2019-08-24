"Define a convenience macro for e2e integration testing"

load("@build_bazel_rules_nodejs//internal/bazel_integration_test:bazel_integration_test.bzl", "rules_nodejs_integration_test")

def e2e_integration_test(**kwargs):
    "Set defaults for the bazel_integration_test common to our e2e"
    tags = kwargs.pop("tags", []) + ["e2e"]
    rules_nodejs_integration_test(tags = tags, **kwargs)
