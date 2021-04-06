"Info about npm tarball files"

NpmTarballInfo = provider(
    doc = "Describe tarballs downloaded from npm registry",
    fields = {
        "tarballs": "depset of needed tarballs to be able to npm install",
    },
)

_DOC = """This rule is a simple reference to a file downloaded from npm.

It is not meant to be used on its own, rather it is generated into BUILD files in external repos
and its provider can then be referenced in actions by tools like pnpm that need to find the .tgz files.
"""

_ATTRS = {
    "deps": attr.label_list(
        doc = "Other npm_tarball rules for packages this one depends on",
        providers = [NpmTarballInfo],
    ),
    "package_name": attr.string(
        doc = "the name field from the package.json of the package this tarball contains",
    ),
    "src": attr.label(
        doc = "The downloaded tarball",
        allow_single_file = [".tgz"],
    ),
}

def _npm_tarball(ctx):
    # Allow aggregate rules like "all_dependencies" to have only deps but no tarball
    if ctx.attr.src and not ctx.attr.package_name:
        fail("when given a src, must also tell the package_name for it")
    direct = []
    direct_files = []
    if ctx.attr.src:
        direct = [struct(
            package_name = ctx.attr.package_name,
            tarball = ctx.file.src,
        )]
        direct_files = [ctx.file.src]

    transitive = [d[NpmTarballInfo].tarballs for d in ctx.attr.deps]
    transitive_files = []
    for dset in transitive:
        for info in dset.to_list():
            transitive_files.append(info.tarball)
    return [
        NpmTarballInfo(tarballs = depset(
            direct,
            transitive = transitive,
        )),
        # For testing
        OutputGroupInfo(
            direct = direct_files,
            transitive = transitive_files,
        ),
    ]

npm_tarball = rule(
    implementation = _npm_tarball,
    attrs = _ATTRS,
    doc = _DOC,
)
