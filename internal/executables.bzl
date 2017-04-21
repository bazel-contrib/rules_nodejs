"""node and TypeScript compiler labels.
"""

def get_tsc():
  return Label("//internal:tsc_wrapped")

def get_node():
  return Label("@io_bazel_typescript_node//:bin/node")
