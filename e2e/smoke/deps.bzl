"""Module extension to fetch dependencies

Most users are better served using aspect_rules_js to fetch dependencies.

This is just http_archive wrapped, see
https://github.com/bazelbuild/bazel/issues/17141
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def _http_impl(ctx):
    for mod in ctx.modules:
        for pkg in mod.tags.archive:
            http_archive(
                name = pkg.name,
                build_file_content = pkg.build_file_content,
                sha256 = pkg.sha256,
                urls = pkg.urls,
            )

http = module_extension(
    implementation = _http_impl,
    tag_classes = {"archive": tag_class(attrs = {
        "name": attr.string(),
        "build_file_content": attr.string(),
        "sha256": attr.string(),
        "urls": attr.string_list(),
    })},
)
