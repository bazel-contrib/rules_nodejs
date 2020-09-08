"""
experimental esbuild rule
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSEcmaScriptModuleInfo", "JSModuleInfo", "NpmPackageInfo", "node_modules_aspect")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect")

def _strip_ext(f):
    return f.short_path[:-len(f.extension) - 1]

def _resolve_js_input(f, inputs):
    if f.extension == "js" or f.extension == "mjs":
        return f

    no_ext = _strip_ext(f)
    for i in inputs:
        if i.extension == "js" or i.extension == "mjs":
            if _strip_ext(i) == no_ext:
                return i
    fail("Could not find corresponding javascript entry point for %s. Add the %s.js to your deps." % (f.path, no_ext))

def _filter_js(files):
    return [f for f in files if f.extension == "js" or f.extension == "mjs"]

def _es_build_impl(ctx):
    # For each dep, JSEcmaScriptModuleInfo is used if found, then JSModuleInfo and finally
    # the DefaultInfo files are used if the former providers are not found.
    deps_depsets = []
    for dep in ctx.attr.deps:
        if JSEcmaScriptModuleInfo in dep:
            deps_depsets.append(dep[JSEcmaScriptModuleInfo].sources)
        elif JSModuleInfo in dep:
            deps_depsets.append(dep[JSModuleInfo].sources)
        elif hasattr(dep, "files"):
            deps_depsets.append(dep.files)

        if NpmPackageInfo in dep:
            deps_depsets.append(dep[NpmPackageInfo].sources)

    deps_inputs = depset(transitive = deps_depsets).to_list()
    inputs = _filter_js(ctx.files.entry_point) + ctx.files.srcs + deps_inputs
    outfile = ctx.outputs.out

    entry_point = _resolve_js_input(ctx.file.entry_point, inputs)

    args = ctx.actions.args()
    args.add("--bundle", entry_point.path)
    args.add_joined(["--outfile", outfile.path], join_with = "=")
    args.add_joined(["--platform", ctx.attr.platform], join_with = "=")
    args.add_joined(["--target", "esnext"], join_with = "=")
    args.add_joined(["--log-level", "error"], join_with = "=")

    for ext in ctx.attr.external:
        args.add("--external:%s" % ext)

    ctx.actions.run(
        inputs = inputs,
        outputs = [outfile],
        executable = ctx.executable._esbuild,
        arguments = [args],
        progress_message = "Bundling Javascript %s [esbuild]" % entry_point.short_path,
    )

    return [
        DefaultInfo(files = depset([outfile])),
        OutputGroupInfo(sources = inputs),
    ]

es_build = rule(
    attrs = {
        "deps": attr.label_list(
            aspects = [module_mappings_aspect, node_modules_aspect],
        ),
        "entry_point": attr.label(
            mandatory = True,
            allow_single_file = True,
        ),
        "external": attr.string_list(
            default = [],
        ),
        "out": attr.output(
            mandatory = True,
        ),
        "platform": attr.string(
            default = "browser",
        ),
        "srcs": attr.label_list(
            allow_files = True,
            default = [],
        ),
        "_esbuild": attr.label(
            allow_single_file = True,
            default = "@esbuild//:bin/esbuild",
            executable = True,
            cfg = "host",
        ),
    },
    implementation = _es_build_impl,
)

def _es_build_repo_impl(rctx):
    VERSION = "0.6.30"
    URLS = {
        "linux": {
            "sha": "",
            "url": "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64",
        },
        "mac os": {
            "sha": "a8dd1bb954f53d338207a1395bf4fe861546d2f12646c414cc72d6ac0e23b475",
            "url": "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64",
        },
        "windows": {
            "sha": "",
            "url": "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64",
        },
    }

    os_name = rctx.os.name.lower()
    if os_name.startswith("mac os"):
        value = URLS["mac os"]
    elif os_name.find("windows") != -1:
        value = URLS["windows"]
    elif os_name.startswith("linux"):
        value = URLS["linux"]
    else:
        fail("Unsupported operating system: " + os_name)

    dl = rctx.download_and_extract(
        value["url"] + "-%s.tgz" % VERSION,
        sha256 = value["sha"],
        stripPrefix = "package",
    )

    BUILD_FILE_CONTENT = """exports_files(["bin/esbuild"])
    """

    rctx.file("BUILD", content = BUILD_FILE_CONTENT)

es_build_repo = repository_rule(
    implementation = _es_build_repo_impl,
)
