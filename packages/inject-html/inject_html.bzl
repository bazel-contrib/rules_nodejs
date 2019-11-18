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
        doc = """Files which should be referenced from the index_html""",
    ),
    "injector": attr.label(
        default = "@npm//@bazel/inject-html/bin:injector",
        executable = True,
        cfg = "host",
    ),
}

def html_asset_inject(index_html, action_factory, injector, root_dirs, assets, output):
    """Injects JS and CSS resources into the index.html.

    Args:
      index_html: The input html file
      action_factory: Bazel's actions module from ctx.actions - see https://docs.bazel.build/versions/master/skylark/lib/actions.html
      injector: The injector executable
      root_dirs: Path prefixes to strip off all assets. Longest wins.
      assets: Asset files to inject
      output: The output html file

    Returns:
      The output html file
    """
    args = action_factory.args()
    args.add(output.path)
    args.add(index_html.path)
    args.add_all(root_dirs)
    args.add("--assets")
    args.add_all(assets)
    args.use_param_file("%s", use_always = True)
    action_factory.run(
        inputs = [index_html],
        outputs = [output],
        executable = injector,
        arguments = [args],
    )
    return output

def _impl(ctx):
    src = ctx.file.src

    if ctx.outputs.out:
        out = ctx.outputs.out
    else:
        # Unusual: we declare an output at the same path as the input
        # foo/index.html -> bazel-bin/foo/index.html
        out = ctx.actions.declare_file(src.basename, sibling = src)

    html_asset_inject(
        src,
        ctx.actions,
        ctx.executable.injector,
        additional_root_paths(ctx),
        [f.path for f in ctx.files.assets],
        out,
    )

    return [
        DefaultInfo(files = depset([out])),
    ]

inject_html = rule(
    doc = _DOC,
    attrs = _ATTRS,
    implementation = _impl,
)
