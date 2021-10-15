"nodejs_library rule"

load("@rules_nodejs//nodejs:providers.bzl", "LinkablePackageInfo")

def _nodejs_library_impl(ctx):
    if not ctx.file.src.is_directory:
        fail("nodejs_library expects a directory as the src")

    runfiles = ctx.runfiles(
        files = ctx.files.src,
        transitive_files = depset(ctx.files.src),
        root_symlinks = {
            "node_modules/" + ctx.attr.package: ctx.file.src,
        },
    )
    return [
        DefaultInfo(files = depset([ctx.file.src])),
        LinkablePackageInfo(package_name = ctx.attr.package, files = ctx.files.src),
    ]

nodejs_library = rule(
    implementation = _nodejs_library_impl,
    attrs = {
        "src": attr.label(
            allow_single_file = True,
            doc = "A TreeArtifact containing the npm package files",
        ),
        "package": attr.string(doc = "name of the npm package"),
    },
    doc = "",
)
