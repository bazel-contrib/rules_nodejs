"""Simple Bazel wrapper around npm history-server package.
"""
load("@build_bazel_rules_nodejs//internal/node:node.bzl", "nodejs_binary")

def history_server(templated_args = [], **kwargs):
  # By default, serve the directory where the target is declared
  if not templated_args:
    templated_args = [native.package_name()]
  nodejs_binary(
      node_modules = "@history-server_runtime_deps//:node_modules",
      entry_point = "history-server/modules/cli.js",
      templated_args = templated_args,
      **kwargs)
"""
This is a simple Bazel wrapper around the history-server npm package.
See https://www.npmjs.com/package/history-server

A typical frontend project is served by a specific server.
This one can support the Angular router.
"""