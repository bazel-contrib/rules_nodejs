"npm_import repository rule"

def _npm_import_impl(repository_ctx):
    repository_ctx.download_and_extract(
        output = "extract_tmp",
        url = "https://registry.npmjs.org/{0}/-/{1}-{2}.tgz".format(
            repository_ctx.attr.package,
            # scoped packages contain a slash in the name, which doesn't appear in the later part of the URL
            repository_ctx.attr.package.split("/")[-1],
            repository_ctx.attr.version,
        ),
        integrity = repository_ctx.attr.integrity,
    )

    # npm packages are always published with one top-level directory inside the tarball, but the name is not predictable
    # so we have to run an external program to inspect the downloaded folder.
    if repository_ctx.os.name == "Windows":
        result = repository_ctx.execute(["dir", "/b", "extract_tmp"])
    else:
        result = repository_ctx.execute(["ls", "extract_tmp"])
    if result.return_code:
        fail("failed to inspect content of npm download: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

    repository_ctx.file("BUILD.bazel", """
load("@e2e_core//:nodejs_package.bzl", "nodejs_package")
load("@rules_nodejs//third_party/github.com/bazelbuild/bazel-skylib:rules/copy_file.bzl", "copy_file")

# Turn a source directory into a TreeArtifact for RBE-compat
copy_file(
    # The default target in this repository
    name = "_{name}",
    src = "extract_tmp/{nested_folder}",
    # This attribute comes from rules_nodejs patch of
    # https://github.com/bazelbuild/bazel-skylib/pull/323
    is_directory = True,
    # We must give this as the directory in order for it to appear on NODE_PATH
    out = "{package_name}",
)

nodejs_package(
    name = "{name}",
    src = "_{name}",
    package_name = "{package_name}",
    visibility = ["//visibility:public"],
)
""".format(
        name = repository_ctx.name,
        nested_folder = result.stdout.rstrip("\n"),
        package_name = repository_ctx.attr.package,
    ))

_npm_import = repository_rule(
    implementation = _npm_import_impl,
    attrs = {
        # TODO(alexeagle): wire this up
        "deps": attr.label_list(),
        "integrity": attr.string(),
        "package": attr.string(mandatory = True),
        "version": attr.string(mandatory = True),
    },
)

def npm_import(integrity, package, version, deps = []):
    """
    Import an existing npm package into Bazel

    To change the proxy URL we use to fetch, configure the Bazel downloader:
    - Make a file containing a rewrite rule like
        rewrite (registry.nodejs.org)/(.*) artifactory.build.internal.net/artifactory/$1/$2
    - To understand the rewrites, see UrlRewriterConfig in Bazel sources:
      https://github.com/bazelbuild/bazel/blob/4.2.1/src/main/java/com/google/devtools/build/lib/bazel/repository/downloader/UrlRewriterConfig.java#L66
    - Point bazel to the config with a line in .bazelrc like
        common --experimental_downloader_config=.bazel_downloader_config

    The name of this repository should contain the version number, so that multiple versions of the same
    package don't collide.

    Similar to rules in other ecosystems such as
        - those named "_import" like apple_bundle_import, scala_import, java_import, py_import
        - go_repository is also a model for this rule

    Args:
        deps: other npm packages this one depends on.
        integrity: Expected checksum of the file downloaded, in Subresource Integrity format.
            This must match the checksum of the file downloaded.

            This is the same as appears in the yarn.lock or package-lock.json file.

            It is a security risk to omit the checksum as remote files can change.
            At best omitting this field will make your build non-hermetic.
            It is optional to make development easier but should be set before shipping.
        package: npm package name, such as `acorn` or `@types/node`
        version: version of the npm package, such as `8.4.0`
    """

    _npm_import(
        name = "npm_{0}-{1}".format(package.replace("@", "_").replace("/", "_"), version),
        deps = deps,
        integrity = integrity,
        package = package,
        version = version,
    )
