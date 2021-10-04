"""
esbuild rule
"""

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@build_bazel_rules_nodejs//:providers.bzl", "ExternalNpmPackageInfo", "JSEcmaScriptModuleInfo", "JSModuleInfo", "NODE_CONTEXT_ATTRS", "NodeContextInfo", "node_modules_aspect", "run_node")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "LinkerPackageMappingInfo", "module_mappings_aspect")
load("@build_bazel_rules_nodejs//internal/common:expand_variables.bzl", "expand_variables")
load("@build_bazel_rules_nodejs//toolchains/esbuild:toolchain.bzl", "TOOLCHAIN")
load(":helpers.bzl", "desugar_entry_point_names", "filter_files", "generate_path_mapping", "resolve_entry_point", "write_args_file", "write_jsconfig_file")

def _esbuild_impl(ctx):
    # For each dep, JSEcmaScriptModuleInfo is used if found, then JSModuleInfo and finally
    # the DefaultInfo files are used if the former providers are not found.
    deps_depsets = []

    # Path alias mapings are used to create a jsconfig with mappings so that esbuild
    # how to resolve custom package or module names
    path_alias_mappings = dict()

    for dep in ctx.attr.deps:
        if JSEcmaScriptModuleInfo in dep:
            deps_depsets.append(dep[JSEcmaScriptModuleInfo].sources)

        if JSModuleInfo in dep:
            deps_depsets.append(dep[JSModuleInfo].sources)
        elif hasattr(dep, "files"):
            deps_depsets.append(dep.files)

        if DefaultInfo in dep:
            deps_depsets.append(dep[DefaultInfo].data_runfiles.files)

        if ExternalNpmPackageInfo in dep:
            deps_depsets.append(dep[ExternalNpmPackageInfo].sources)

        # Collect the path alias mapping to resolve packages correctly
        if LinkerPackageMappingInfo in dep:
            for key, value in dep[LinkerPackageMappingInfo].mappings.items():
                # key is of format "package_name:package_path"
                package_name = key.split(":")[0]
                path_alias_mappings.update(generate_path_mapping(package_name, value.replace(ctx.bin_dir.path + "/", "")))

    entry_points = desugar_entry_point_names(ctx.file.entry_point, ctx.files.entry_points)

    deps_inputs = depset(transitive = deps_depsets).to_list()

    inputs = deps_inputs + ctx.files.srcs + filter_files(entry_points)

    inputs = [d for d in inputs if not (d.path.endswith(".d.ts") or d.path.endswith(".tsbuildinfo"))]

    outputs = []

    args = dict({
        "bundle": True,
        "define": dict([
            [
                k,
                expand_variables(ctx, ctx.expand_location(v), attribute_name = "define"),
            ]
            for k, v in ctx.attr.define.items()
        ]),
        # the entry point files to bundle
        "entryPoints": [
            resolve_entry_point(entry_point, inputs, ctx.files.srcs).path
            for entry_point in entry_points
        ],
        "external": ctx.attr.external,
        # by default the log level is "info" and includes an output file summary
        # under bazel this is slightly redundant and may lead to spammy logs
        # Also disable the log limit and show all logs
        "logLevel": "warning",
        "logLimit": 0,
        "metafile": True,
        "platform": ctx.attr.platform,
        "preserveSymlinks": True,
        "sourcesContent": ctx.attr.sources_content,
        "target": ctx.attr.target,
    })

    if len(ctx.attr.sourcemap) > 0:
        args.update({"sourcemap": ctx.attr.sourcemap})
    else:
        args.update({"sourcemap": True})

    if ctx.attr.minify:
        args.update({"minify": True})
    else:
        # by default, esbuild will tree-shake 'pure' functions
        # disable this unless also minifying
        args.update({"ignoreAnnotations": True})

    if ctx.attr.splitting:
        if not ctx.attr.output_dir:
            fail("output_dir must be set to True when splitting is set to True")
        args.update({
            "format": "esm",
            "splitting": True,
        })

    if ctx.attr.output_dir:
        js_out = ctx.actions.declare_directory("%s" % ctx.attr.name)
        outputs.append(js_out)

        # disable the log limit and show all logs
        args.update({
            "outdir": js_out.path,
        })
    else:
        js_out = ctx.outputs.output
        outputs.append(js_out)

        js_out_map = ctx.outputs.output_map
        if ctx.attr.sourcemap != "inline":
            if js_out_map == None:
                fail("output_map must be specified if sourcemap is not set to 'inline'")
            outputs.append(js_out_map)

        if ctx.outputs.output_css:
            outputs.append(ctx.outputs.output_css)

        if ctx.attr.format:
            args.update({"format": ctx.attr.format})

        args.update({"outfile": js_out.path})

    jsconfig_file = write_jsconfig_file(ctx, path_alias_mappings)
    inputs.append(jsconfig_file)
    args.update({"tsconfig": jsconfig_file.path})

    env = {
        "ESBUILD_BINARY_PATH": ctx.toolchains[TOOLCHAIN].binary.path,
    }

    if ctx.attr.max_threads > 0:
        env["GOMAXPROCS"] = str(ctx.attr.max_threads)

    execution_requirements = {}
    if "no-remote-exec" in ctx.attr.tags:
        execution_requirements = {"no-remote-exec": "1"}

    # setup the args passed to the launcher
    launcher_args = ctx.actions.args()

    args_file = write_args_file(ctx, args)
    inputs.append(args_file)
    launcher_args.add("--esbuild_args=%s" % args_file.path)

    # add metafile
    meta_file = ctx.actions.declare_file("%s_metadata.json" % ctx.attr.name)
    outputs.append(meta_file)
    launcher_args.add("--metafile=%s" % meta_file.path)

    # add reference to the users args file, these are merged within the launcher
    if ctx.attr.args_json:
        user_args_file = ctx.actions.declare_file("%s.user.args.json" % ctx.attr.name)
        inputs.append(user_args_file)
        ctx.actions.write(
            output = user_args_file,
            content = ctx.expand_location(ctx.attr.args_json),
        )
        launcher_args.add("--user_args=%s" % user_args_file.path)

    if ctx.attr.config:
        configs = ctx.attr.config[JSEcmaScriptModuleInfo].sources.to_list()
        if len(configs) != 1:
            fail("Expected only one source file: the configuration entrypoint")

        inputs.append(configs[0])
        launcher_args.add("--config_file=%s" % configs[0].path)

    stamp = ctx.attr.node_context_data[NodeContextInfo].stamp
    if stamp:
        inputs.append(ctx.info_file)
        env["BAZEL_INFO_FILE"] = ctx.info_file.path

        inputs.append(ctx.version_file)
        env["BAZEL_VERSION_FILE"] = ctx.version_file.path

    run_node(
        ctx = ctx,
        inputs = depset(inputs),
        outputs = outputs,
        arguments = [launcher_args],
        progress_message = "%s Javascript %s [esbuild]" % ("Bundling" if not ctx.attr.output_dir else "Splitting", " ".join([entry_point.short_path for entry_point in entry_points])),
        execution_requirements = execution_requirements,
        mnemonic = "esbuild",
        env = env,
        executable = "launcher",
        link_workspace_root = ctx.attr.link_workspace_root,
        tools = [ctx.toolchains[TOOLCHAIN].binary],
    )

    outputs_depset = depset(outputs)

    return [
        DefaultInfo(
            files = outputs_depset,
        ),
        JSModuleInfo(
            direct_sources = outputs_depset,
            sources = outputs_depset,
        ),
    ]

esbuild = rule(
    attrs = dict({
        "args": attr.string_dict(
            default = {},
            doc = """A dict of extra arguments that are included in the call to esbuild, where the key is the argument name.
Values are subject to $(location ...) expansion""",
        ),
        "args_json": attr.string(
            mandatory = False,
            doc = "Internal use only",
        ),
        "define": attr.string_dict(
            default = {},
            doc = """A dict of global identifier replacements. Values are subject to $(location ...) expansion.
Example:
```python
esbuild(
    name = "bundle",
    define = {
        "process.env.NODE_ENV": "production"
    },
)
```

See https://esbuild.github.io/api/#define for more details
            """,
        ),
        "deps": attr.label_list(
            default = [],
            aspects = [module_mappings_aspect, node_modules_aspect],
            doc = "A list of direct dependencies that are required to build the bundle",
        ),
        "entry_point": attr.label(
            allow_single_file = True,
            doc = """The bundle's entry point (e.g. your main.js or app.js or index.js)

This is a shortcut for the `entry_points` attribute with a single entry.
Specify either this attribute or `entry_point`, but not both.
""",
        ),
        "entry_points": attr.label_list(
            allow_files = True,
            doc = """The bundle's entry points (e.g. your main.js or app.js or index.js)

Specify either this attribute or `entry_point`, but not both.
""",
        ),
        "external": attr.string_list(
            default = [],
            doc = """A list of module names that are treated as external and not included in the resulting bundle

See https://esbuild.github.io/api/#external for more details
            """,
        ),
        "format": attr.string(
            values = ["iife", "cjs", "esm", ""],
            mandatory = False,
            doc = """The output format of the bundle, defaults to iife when platform is browser
and cjs when platform is node. If performing code splitting or multiple entry_points are specified, defaults to esm.

See https://esbuild.github.io/api/#format for more details
        """,
        ),
        "launcher": attr.label(
            mandatory = True,
            executable = True,
            doc = "Internal use only",
            cfg = "exec",
        ),
        "link_workspace_root": attr.bool(
            doc = """Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
    If source files need to be required then they can be copied to the bin_dir with copy_to_bin.""",
        ),
        "max_threads": attr.int(
            mandatory = False,
            doc = """Sets the `GOMAXPROCS` variable to limit the number of threads that esbuild can run with.
This can be useful if running many esbuild rule invocations in parallel, which has the potential to cause slowdown.
For general use, leave this attribute unset.
            """,
        ),
        "minify": attr.bool(
            default = False,
            doc = """Minifies the bundle with the built in minification.
Removes whitespace, shortens identifieres and uses equivalent but shorter syntax.

Sets all --minify-* flags

See https://esbuild.github.io/api/#minify for more details
            """,
        ),
        "output": attr.output(
            mandatory = False,
            doc = "Name of the output file when bundling",
        ),
        "output_css": attr.output(
            mandatory = False,
            doc = """Declare a .css file will be output next to output bundle.

If your JS code contains import statements that import .css files, esbuild will place the
content in a file next to the main output file, which you'll need to declare. If your output
file is named 'foo.js', you should set this to 'foo.css'.""",
        ),
        "output_dir": attr.bool(
            default = False,
            doc = """If true, esbuild produces an output directory containing all output files""",
        ),
        "output_map": attr.output(
            mandatory = False,
            doc = "Name of the output source map when bundling",
        ),
        "platform": attr.string(
            default = "browser",
            values = ["node", "browser", "neutral", ""],
            doc = """The platform to bundle for.

See https://esbuild.github.io/api/#platform for more details
            """,
        ),
        "sourcemap": attr.string(
            values = ["external", "inline", "both", ""],
            mandatory = False,
            doc = """Defines where sourcemaps are output and how they are included in the bundle. By default, a separate `.js.map` file is generated and referenced by the bundle. If 'external', a separate `.js.map` file is generated but not referenced by the bundle. If 'inline', a sourcemap is generated and its contents are inlined into the bundle (and no external sourcemap file is created). If 'both', a sourcemap is inlined and a `.js.map` file is created.

See https://esbuild.github.io/api/#sourcemap for more details
            """,
        ),
        "sources_content": attr.bool(
            mandatory = False,
            default = False,
            doc = """If False, omits the `sourcesContent` field from generated source maps

See https://esbuild.github.io/api/#sources-content for more details
            """,
        ),
        "splitting": attr.bool(
            default = False,
            doc = """If true, esbuild produces an output directory containing all the output files from code splitting for multiple entry points

See https://esbuild.github.io/api/#splitting and https://esbuild.github.io/api/#entry-points for more details
            """,
        ),
        "srcs": attr.label_list(
            allow_files = True,
            default = [],
            doc = """Source files to be made available to esbuild""",
        ),
        "target": attr.string(
            default = "es2015",
            doc = """Environment target (e.g. es2017, chrome58, firefox57, safari11, 
edge16, node10, esnext). Default es2015.

See https://esbuild.github.io/api/#target for more details
            """,
        ),
        "config": attr.label(
            providers = [JSEcmaScriptModuleInfo],
            mandatory = False,
            doc = """Configuration file used for esbuild, from the esbuild_config macro. Note that options set in this file may get overwritten.
See https://github.com/bazelbuild/rules_nodejs/tree/stable/packages/esbuild/test/plugins/BUILD.bazel for examples of using esbuild_config and plugins.
            """,
        ),
    }, **NODE_CONTEXT_ATTRS),
    implementation = _esbuild_impl,
    toolchains = [
        str(TOOLCHAIN),
    ],
    doc = """Runs the esbuild bundler under Bazel

For further information about esbuild, see https://esbuild.github.io/
    """,
)

def esbuild_macro(name, output_dir = False, splitting = False, **kwargs):
    """esbuild helper macro around the `esbuild_bundle` rule

    For a full list of attributes, see the `esbuild_bundle` rule

    Args:
        name: The name used for this rule and output files
        output_dir: If `True`, produce an output directory
        splitting: If `True`, produce a code split bundle in the output directory
        **kwargs: All other args from `esbuild_bundle`
    """

    kwargs.pop("launcher", None)
    _launcher = "_%s_esbuild_launcher" % name
    nodejs_binary(
        name = _launcher,
        entry_point = Label("@build_bazel_rules_nodejs//packages/esbuild:launcher.js"),
    )

    srcs = kwargs.pop("srcs", [])
    deps = kwargs.pop("deps", []) + ["@esbuild_npm//esbuild"]
    entry_points = kwargs.get("entry_points", None)

    # TODO(mattem): remove `args` and `args_json` in 5.x and everything can go via `config`
    args_json = kwargs.pop("args_json", None)
    if args_json:
        fail("Setting 'args_json' is not supported, set 'config' instead")

    args = kwargs.pop("args", {})
    if args:
        if type(args) != type(dict()):
            fail("Expected 'args' to be of type dict")

        args_json = json.encode(args)

    config = kwargs.pop("config", None)
    if config:
        kwargs.setdefault("config", config)
        deps.append("%s_deps" % config)

    if output_dir == True or entry_points or splitting == True:
        esbuild(
            name = name,
            srcs = srcs,
            splitting = splitting,
            output_dir = True,
            args_json = args_json,
            launcher = _launcher,
            deps = deps,
            **kwargs
        )
    else:
        output = "%s.js" % name
        if "output" in kwargs:
            output = kwargs.pop("output")

        output_map = None
        sourcemap = kwargs.get("sourcemap", None)
        if sourcemap != "inline":
            output_map = "%s.map" % output

        esbuild(
            name = name,
            srcs = srcs,
            args_json = args_json,
            output = output,
            output_map = output_map,
            launcher = _launcher,
            deps = deps,
            **kwargs
        )
