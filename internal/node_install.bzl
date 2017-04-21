def _get_arch(repository_ctx):
  os_name = repository_ctx.os.name.lower()
  if os_name.startswith("mac os"):
    return repository_ctx.path(repository_ctx.attr._macos).dirname
  if os_name.find("windows") != -1:
    return repository_ctx.path(repository_ctx.attr._windows).dirname
  return repository_ctx.path(repository_ctx.attr._linux).dirname

# Symlink the node repository for the users platform to this repository.
# This allows other rules to ignore platform-dependencies.
def _node_impl(ctx):
  ctx.symlink(_get_arch(ctx), ctx.path(''))
  ctx.file("WORKSPACE", "workspace(name = '%s')" % ctx.name)
  ctx.file("BUILD", """
package(default_visibility = ["//visibility:public"])
exports_files([
  "bin/node",
  "bin/npm",
])
""")
  ctx.file("BUILD.bazel", """
package(default_visibility = ["//visibility:public"])
exports_files([
  "bin/node",
  "bin/npm",
])
""")

_node = repository_rule(
    _node_impl,
    attrs = {
      "_linux": attr.label(
          default = Label("@nodejs_linux_x64//:WORKSPACE"),
          allow_files = True,
          single_file = True,
      ),
      "_macos": attr.label(
          default = Label("@nodejs_darwin_x64//:WORKSPACE"),
          allow_files = True,
          single_file = True,
      ),
      "_windows": attr.label(
          default = Label("@nodejs_windows_x64//:WORKSPACE"),
          allow_files = True,
          single_file = True,
      ),
      "_yarn": attr.label(
          default = Label("@yarn//:WORKSPACE"),
          allow_files = True,
          single_file = True,
      ),
    },
)

def node_repositories():

    native.new_http_archive(
        name = "nodejs_linux_x64",
        url = "https://nodejs.org/dist/v6.6.0/node-v6.6.0-linux-x64.tar.gz",
        type = "tar.gz",
        strip_prefix = "node-v6.6.0-linux-x64",
        sha256 = "c22ab0dfa9d0b8d9de02ef7c0d860298a5d1bf6cae7413fb18b99e8a3d25648a",
        build_file_content = "",
    )

    native.new_http_archive(
        name = "nodejs_darwin_x64",
        url = "https://nodejs.org/dist/v6.6.0/node-v6.6.0-darwin-x64.tar.gz",
        type = "tar.gz",
        strip_prefix = "node-v6.6.0-darwin-x64",
        sha256 = "c8d1fe38eb794ca46aacf6c8e90676eec7a8aeec83b4b09f57ce503509e7a19f",
        build_file_content = "",
    )

    native.new_http_archive(
        name = "nodejs_windows_x64",
        url = "https://nodejs.org/dist/v6.10.0/node-v6.6.0-win-x64.zip",
        type = "zip",
        strip_prefix = "node-v6.6.0-win-x64",
        sha256 = "95862922b8469e00a7ae5f1f82d51c739fdc6ee12a8e1d46c0f100f2ea18c082",
        build_file_content = "",
    )

    _node(
        name = "io_bazel_typescript_node",
    )
