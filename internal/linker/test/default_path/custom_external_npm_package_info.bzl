"""Custom `ExternalNpmPackageInfo` target without a `path` attribute."""

load(
    "//internal/providers:external_npm_package_info.bzl",
    "ExternalNpmPackageInfo",
)

def _custom_external_npm_package_info_impl(ctx):
    return ExternalNpmPackageInfo(
        direct_sources = depset([], transitive = ctx.files.deps),
        sources = depset(ctx.files.srcs, transitive = ctx.files.deps),
        has_directories = False,
        workspace = "npm",
        # `path` is intentionally **not** provided.
        # Historical note: `ExternalNpmPackageInfo` was publicly exported prior
        # to the `path` attribute's introduction. This means that we cannot
        # assume an `ExternalNpmPackageInfo` has a `path`, and must safely check
        # it each time.
    )

custom_external_npm_package_info = rule(
    implementation = _custom_external_npm_package_info_impl,
    attrs = {
        "srcs": attr.label_list(
            allow_files = True,
            default = [],
        ),
        "deps": attr.label_list(default = []),
    },
)
