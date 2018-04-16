"""Simple Bazel wrapper around npm http-server package.

See https://www.npmjs.com/package/http-server

We modify it to support serving Brotli-compressed files, which end with .br
extension. This is equivalent to gzip-compression support.
See https://github.com/alexeagle/http-server/commits/master which points to
a modified ecstatic library.
"""
load("//internal/node:node.bzl", "nodejs_binary")

def http_server(**kwargs):
  """
  Invokes the http-server binary.

  The assets to serve should be passed through the `data` attribute.

  Example:
  ```
  load("@build_bazel_rules_nodejs//:defs.bzl", "http_server")

  http_server(
      name = "prodserver",
      # These are the arguments to the http-server, see 
      # https://www.npmjs.com/package/http-server#available-options
      args = [
          # serve /index.html, not a directory listing
          "-d",
          "false",
          "./packages/core/test/bundling/todo",
      ],
      data = [
          "base.css",
          "index.html",
          ":bundle.min.js.br", # Brotli-compressed
          ":bundle.min_debug.js",
      ],
  )
  ```

  Args:
    **kwargs: passed to the underlying nodejs_binary rule
  """
  nodejs_binary(
      node_modules = "@build_bazel_rules_nodejs_http_server_deps//:node_modules",
      entry_point = "http-server/bin/http-server",
      **kwargs)
