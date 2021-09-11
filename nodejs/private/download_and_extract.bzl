"Repository rule wrapper around Bazel's download_and_extract"

def _bazel_download(repository_ctx):
    repository_ctx.file("BUILD.bazel", repository_ctx.attr.build_file_content)
    repository_ctx.download_and_extract(
        url = repository_ctx.attr.url,
        integrity = repository_ctx.attr.integrity,
    )
    

bazel_download = repository_rule(
    doc = """Utility to call Bazel downloader.

    This is a simple pass-thru wrapper for Bazel's
    [repository_ctx#download](https://docs.bazel.build/versions/main/skylark/lib/repository_ctx.html#download)
    function.
    """,
    implementation = _bazel_download,
    attrs = {
        "build_file_content": attr.string(
            doc = "Content for the generated BUILD file.",
            mandatory = True,
        ),
        "integrity": attr.string(
            doc = """
            Expected checksum of the file downloaded, in Subresource Integrity format.
            This must match the checksum of the file downloaded.
            It is a security risk to omit the checksum as remote files can change.
            At best omitting this field will make your build non-hermetic.
            It is optional to make development easier but should be set before shipping.
            """,
        ),
        "url": attr.string_list(
            doc = "List of mirror URLs referencing the same file.",
            mandatory = True,
        ),
    },
)