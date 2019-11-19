"Inject script and link tags into html files"

load("@build_bazel_rules_nodejs//internal/web_package:web_package.bzl", "additional_root_paths")

_DOC = """Inject script and link tags into html file

The file in `src` is copied to the output directory with the same filename,
but the contents are modified such that any `.js` files in the `assets` are
referenced with a `script` tag, and any `.css` files are referenced with a `link` tag.
"""

_ATTRS = {
    "src": attr.label(doc = "html file", allow_single_file = [".html"]),
    "out": attr.output(
        doc = "Path to write the output. If not provided, src will be copied to the same path in the output tree",
    ),
    "additional_root_paths": attr.string_list(
        doc = """Path prefixes to strip off all assets, in addition to the current package. Longest wins.""",
    ),
    "assets": attr.label_list(
        allow_files = True,
        doc = """Files which should be referenced from the output html""",
    ),
    "injector": attr.label(
        default = "@npm//@bazel/inject-html/bin:injector",
        executable = True,
        cfg = "host",
    ),
}

def _impl(ctx):
    src = ctx.file.src

    if ctx.outputs.out:
        out = ctx.outputs.out
    else:
        # Unusual: we declare an output at the same path as the input
        # foo/index.html -> bazel-bin/foo/index.html
        out = ctx.actions.declare_file(src.basename, sibling = src)

    args = ctx.actions.args()
    args.add(out.path)
    args.add(src.path)
    args.add_all(additional_root_paths(ctx))
    args.add("--assets")
    args.add_all([f.path for f in ctx.files.assets])
    args.use_param_file("%s", use_always = True)
    ctx.actions.run(
        inputs = [src],
        outputs = [out],
        executable = ctx.executable.injector,
        arguments = [args],
    )

    return [
        DefaultInfo(files = depset([out])),
    ]

inject_html = rule(
    doc = _DOC,
    attrs = _ATTRS,
    implementation = _impl,
)
