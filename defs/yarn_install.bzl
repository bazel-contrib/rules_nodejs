def _yarn_install_impl(ctx):
  project_dir = ctx.path(ctx.attr.package_json).dirname
  ctx.template("yarn_install.sh", Label("//defs:yarn_install.sh"))
  result = ctx.execute(["./yarn_install.sh", ctx.path(ctx.attr.package_json), ctx.path(ctx.attr._yarn)])
  if result.return_code > 0:
    print(result.stdout)
    print(result.stderr)

  # symlink the node_module directory from the user's workspace
  ctx.symlink(project_dir.get_child("node_modules"), "node_modules")
  # add a BUILD file inside the user's node_modules folder
  ctx.file("node_modules/BUILD", """
# Export some specific helpers we will need
exports_files(["typescript/lib/tsc.js", "typescript/lib/lib.es5.d.ts"])
filegroup(name = "node_modules", srcs = glob(["**/*"]))
""")

_yarn_install = repository_rule(
    _yarn_install_impl,
    attrs = {
        "package_json": attr.label(),
        "_yarn": attr.label(default = Label("@yarn_pkg//:bin/yarn"))
    },
)

def yarn_install(package_json):
    native.new_http_archive(
        name = "yarn_pkg",
        url = "https://github.com/yarnpkg/yarn/releases/download/v0.22.0/yarn-v0.22.0.tar.gz",
        strip_prefix = "dist",
        type = "tar.gz",
        build_file_content = """
package(default_visibility = ["//visibility:public"])
exports_files(["bin/yarn"])
""",
    )

    # Call this workspace "yarn" so there will be targets like
    # @yarn//node_modules:all
    # Within the user's project, they can refer to //node_modules:all
    # but from other repositories, like the @io_bazel_rules_typescript
    # repository, we also need to find some labels under node_modules.
    _yarn_install(name = "yarn", package_json = package_json)
