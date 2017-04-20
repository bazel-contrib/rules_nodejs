# Load the TypeScript rules from our repository
load("//:defs.bzl", "ts_library")

# Simple compilation test that produces bazel-bin/test.{js,d.ts}
ts_library(
  name = "hello_world",
  srcs = ["test.ts"],
)
