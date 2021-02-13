"Wrap stardoc to set our repo-wide defaults"

load("@io_bazel_stardoc//stardoc:stardoc.bzl", _stardoc = "stardoc")
load("//:index.bzl", _npm_package_bin = "npm_package_bin")

def stardoc(name, out = "README.md", **kwargs):
    """Helper macro around the stardoc rule for generating different outputs

    Args:
        name: Unique name for this rule
        out: Output filename
        **kwargs: All other args
    """

    tags = kwargs.pop("tags", [])
    preamble = kwargs.pop("preamble", None)

    proto_out_file = "%s.api" % name

    _stardoc(
        name = "%s_stardoc" % name,
        format = "proto",
        out = proto_out_file,
        tags = tags,
        **kwargs
    )

    data = [proto_out_file]
    args = ["--in=$(location :%s)" % proto_out_file]

    if preamble != None:
        data.append(preamble)
        args.append("--preamble=$(location %s)" % preamble)

    _npm_package_bin(
        name = name,
        tool = "//tools/stardoc:renderer_tool",
        args = args + [
            "--out=$(location :%s)" % out,
        ],
        data = data,
        outs = [out],
        tags = tags,
        visibility = kwargs.get("visibility", []),
    )

    # Need a different README for the docs and npm packages so the npm_package README.md
    # doesn't contain the hijacked formatting
    # This target can also output the JSON version of the stardoc proto used for search
    docs_md_out = "%s.site.md" % name
    json_out = "%s.json" % name
    _npm_package_bin(
        name = "%s_docsite" % name,
        tool = "//tools/stardoc:renderer_tool",
        args = args + [
            "--out=$(location :%s)" % docs_md_out,
            "--json=$(location :%s)" % json_out,
            "--fancy=y",
        ],
        data = data,
        outs = [
            docs_md_out,
            json_out,
        ],
        tags = tags,
        visibility = ["//docs-site:__subpackages__"],
    )
