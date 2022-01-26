"""
This file mimics what we would get when we install a npm package with bin entries. Only used when jasmine_node_test is used directly
from rnj sources and should not be published.
"""

load("@build_bazel_rules_nodejs//internal/node:node.bzl", nodejs_test = "nodejs_test_macro")

def jasmine_runner_test(**kwargs):
    nodejs_test(
        entry_point = "//packages/jasmine:jasmine_runner.js",
        data = ["//packages/jasmine"] + kwargs.pop("data", []),
        **kwargs
    )
