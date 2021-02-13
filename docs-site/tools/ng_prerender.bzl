""

load("//:index.bzl", _nodejs_binary = "nodejs_binary")
load("//docs-site/tools:defaults.bzl", _ts_library = "ts_library")

def _get_output_path(route, root_at):
    return root_at + "/" + route + "/index.html"

def ng_prerender(name, index, prerender_module, pages = [], prerender_roots = [], **kwargs):
    """
    Helper macro for prerendering Angular routes to index files as part of the build

    The outputs of this macro are:
        %name% - all the rendered roots, plus the root route /
        %name%.root - an alias referencing just the root index file
        %name%.%route% - an alias referencing each rendered route, with / replaced by underscores

    Args:
        name: Rule name for the main output genrule
        index: Label for the production index.html file with which to render into
        prerender_module: platform server ng_module label for prerendering
        prerender_roots: A list of roots that will be prerendered as part of this macro, the root route / is always rendered
        pages: Stuff
        **kwargs:
    """

    renderer_lib = "%s_renderer_lib" % name
    _ts_library(
        name = renderer_lib,
        srcs = ["//docs-site/src:prerender.ts"],
        deps = [
            prerender_module,
            "@npm//@angular/platform-server",
            "@npm//zone.js",
            "@npm//domino",
            "@npm//reflect-metadata",
            "@npm//@types/node",
        ],
    )

    bin = "%s_bin" % renderer_lib
    _nodejs_binary(
        name = bin,
        data = [
            ":%s" % renderer_lib,
            "@npm//@angular/platform-server",
            "@npm//zone.js",
            "@npm//domino",
            "@npm//reflect-metadata",
        ],
        entry_point = "//docs-site/src:prerender.ts",
        templated_args = ["--nobazel_run_linker"],
    )

    root_at = "_pkg/" + native.package_name()

    # we can't output "foo/index.html" since that collides with source files and will likely cross a package boundary
    # so we output "_prerender/pkg_name/route/index.html"
    prerender_root_outs = [_get_output_path(route, root_at) for route in prerender_roots]
    root_index = "%s/index.html" % root_at

    visibility = kwargs.pop("visibility", [])

    native.genrule(
        name = name,
        srcs = [index, pages],
        outs = [root_index] + prerender_root_outs,
        cmd = "$(location :%s) --index $(location %s) --outs $(OUTS) --routes / %s --pages $(locations %s)" % (bin, index, " ".join(prerender_roots), pages),
        tools = [":%s" % bin],
        message = "Prerendering Angular",
        visibility = visibility,
        tags = kwargs.pop("tags", []),
    )

    # convenience "output groups" from macro
    native.alias(
        name = "%s.root" % name,
        actual = root_index,
        visibility = visibility,
    )

    for route in prerender_roots:
        native.alias(
            name = "%s.%s" % (name, route.replace("/", "_")),
            actual = _get_output_path(route, root_at),
            visibility = visibility,
        )
