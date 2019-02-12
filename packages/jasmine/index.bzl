# Public API surface re-exports
# Users shouldn't import under src/

load("//:src/jasmine_node_test.bzl", _jasmine_node_test = "jasmine_node_test")

jasmine_node_test = _jasmine_node_test
