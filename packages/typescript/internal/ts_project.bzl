"ts_project rule"

load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "NpmPackageInfo", "declaration_info", "js_module_info", "run_node")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect")
load("@build_bazel_rules_nodejs//internal/node:node.bzl", "nodejs_binary")
load(":ts_config.bzl", "TsConfigInfo", "write_tsconfig")

_ValidOptionsInfo = provider()

_DEFAULT_TSC = (
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//typescript/bin:tsc"
)

_DEFAULT_TSC_BIN = (
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//:node_modules/typescript/bin/tsc"
)

_ATTRS = {
    "args": attr.string_list(),
    "declaration_dir": attr.string(),
    "deps": attr.label_list(
        providers = [
            # Provide one or the other of these
            [DeclarationInfo],
            [_ValidOptionsInfo],
        ],
        aspects = [module_mappings_aspect],
    ),
    "extends": attr.label_list(allow_files = [".json"]),
    "link_workspace_root": attr.bool(),
    "out_dir": attr.string(),
    "root_dir": attr.string(),
    # NB: no restriction on extensions here, because tsc sometimes adds type-check support
    # for more file kinds (like require('some.json')) and also
    # if you swap out the `compiler` attribute (like with ngtsc)
    # that compiler might allow more sources than tsc does.
    "srcs": attr.label_list(allow_files = True, mandatory = True),
    "supports_workers": attr.bool(
        doc = """Experimental! Use only with caution.

Allows you to enable the Bazel Worker strategy for this project.
This requires that the tsc binary support it.""",
        default = False,
    ),
    "tsc": attr.label(default = Label(_DEFAULT_TSC), executable = True, cfg = "target"),
    "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
}

# tsc knows how to produce the following kinds of output files.
# NB: the macro `ts_project_macro` will set these outputs based on user
# telling us which settings are enabled in the tsconfig for this project.
_OUTPUTS = {
    "buildinfo_out": attr.output(),
    "js_outs": attr.output_list(),
    "map_outs": attr.output_list(),
    "typing_maps_outs": attr.output_list(),
    "typings_outs": attr.output_list(),
}

def _join(*elements):
    segments = [f for f in elements if f]
    if len(segments):
        return "/".join(segments)
    return "."

def _ts_project_impl(ctx):
    arguments = ctx.actions.args()
    execution_requirements = {}
    progress_prefix = "Compiling TypeScript project"

    if ctx.attr.supports_workers:
        # Set to use a multiline param-file for worker mode
        arguments.use_param_file("@%s", use_always = True)
        arguments.set_param_file_format("multiline")
        execution_requirements["supports-workers"] = "1"
        execution_requirements["worker-key-mnemonic"] = "TsProjectMnemonic"
        progress_prefix = "Compiling TypeScript project (worker mode)"

    generated_srcs = False
    for src in ctx.files.srcs:
        if src.is_source:
            if generated_srcs:
                fail("srcs cannot be a mix of generated files and source files")
        else:
            generated_srcs = True

    # Add user specified arguments *before* rule supplied arguments
    arguments.add_all(ctx.attr.args)

    arguments.add_all([
        "--project",
        ctx.file.tsconfig.path,
        "--outDir",
        _join(ctx.bin_dir.path, ctx.label.package, ctx.attr.out_dir),
        "--rootDir",
        _join(
            ctx.bin_dir.path if generated_srcs else None,
            ctx.label.package,
            ctx.attr.root_dir,
        ),
    ])
    if len(ctx.outputs.typings_outs) > 0:
        declaration_dir = ctx.attr.declaration_dir if ctx.attr.declaration_dir else ctx.attr.out_dir
        arguments.add_all([
            "--declarationDir",
            _join(ctx.bin_dir.path, ctx.label.package, declaration_dir),
        ])

    # When users report problems, we can ask them to re-build with
    # --define=VERBOSE_LOGS=1
    # so anything that's useful to diagnose rule failures belongs here
    if "VERBOSE_LOGS" in ctx.var.keys():
        arguments.add_all([
            # What files were in the ts.Program
            "--listFiles",
            # Did tsc write all outputs to the place we expect to find them?
            "--listEmittedFiles",
            # Why did module resolution fail?
            "--traceResolution",
            # Why was the build slow?
            "--diagnostics",
            "--extendedDiagnostics",
        ])

    deps_depsets = []
    inputs = ctx.files.srcs[:]
    for dep in ctx.attr.deps:
        if TsConfigInfo in dep:
            deps_depsets.append(dep[TsConfigInfo].deps)
        if NpmPackageInfo in dep:
            # TODO: we could maybe filter these to be tsconfig.json or *.d.ts only
            # we don't expect tsc wants to read any other files from npm packages.
            deps_depsets.append(dep[NpmPackageInfo].sources)
        if DeclarationInfo in dep:
            deps_depsets.append(dep[DeclarationInfo].transitive_declarations)
        if _ValidOptionsInfo in dep:
            inputs.append(dep[_ValidOptionsInfo].marker)

    inputs.extend(depset(transitive = deps_depsets).to_list())

    # Gather TsConfig info from both the direct (tsconfig) and indirect (extends) attribute
    if TsConfigInfo in ctx.attr.tsconfig:
        inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)
    else:
        inputs.append(ctx.file.tsconfig)
    for extend in ctx.attr.extends:
        if TsConfigInfo in extend:
            inputs.extend(extend[TsConfigInfo].deps)
        else:
            inputs.extend(extend.files.to_list())

    # We do not try to predeclare json_outs, because their output locations generally conflict with their path in the source tree.
    # (The exception is when out_dir is used, then the .json output is a different path than the input.)
    # However tsc will copy .json srcs to the output tree so we want to declare these outputs to include along with .js Default outs
    # NB: We don't have emit_declaration_only setting here, so use presence of any JS outputs as an equivalent.
    # tsc will only produce .json if it also produces .js
    if len(ctx.outputs.js_outs):
        json_outs = [
            ctx.actions.declare_file(_join(ctx.attr.out_dir, src.short_path[len(ctx.label.package) + 1:]))
            for src in ctx.files.srcs
            if src.basename.endswith(".json")
        ]
    else:
        json_outs = []

    outputs = json_outs + ctx.outputs.js_outs + ctx.outputs.map_outs + ctx.outputs.typings_outs + ctx.outputs.typing_maps_outs
    if ctx.outputs.buildinfo_out:
        arguments.add_all([
            "--tsBuildInfoFile",
            ctx.outputs.buildinfo_out.path,
        ])
        outputs.append(ctx.outputs.buildinfo_out)
    runtime_outputs = json_outs + ctx.outputs.js_outs + ctx.outputs.map_outs
    typings_outputs = ctx.outputs.typings_outs + ctx.outputs.typing_maps_outs + [s for s in ctx.files.srcs if s.path.endswith(".d.ts")]
    default_outputs_depset = depset(runtime_outputs) if len(runtime_outputs) else depset(typings_outputs)

    if len(outputs) > 0:
        run_node(
            ctx,
            inputs = inputs,
            arguments = [arguments],
            outputs = outputs,
            executable = "tsc",
            execution_requirements = execution_requirements,
            progress_message = "%s %s [tsc -p %s]" % (
                progress_prefix,
                ctx.label,
                ctx.file.tsconfig.short_path,
            ),
            link_workspace_root = ctx.attr.link_workspace_root,
        )

    providers = [
        # DefaultInfo is what you see on the command-line for a built library,
        # and determines what files are used by a simple non-provider-aware
        # downstream library.
        # Only the JavaScript outputs are intended for use in non-TS-aware
        # dependents.
        DefaultInfo(
            files = default_outputs_depset,
            runfiles = ctx.runfiles(
                transitive_files = default_outputs_depset,
                collect_default = True,
            ),
        ),
        js_module_info(
            sources = depset(runtime_outputs),
            deps = ctx.attr.deps,
        ),
        TsConfigInfo(deps = depset([ctx.file.tsconfig] + ctx.files.extends, transitive = [
            dep[TsConfigInfo].deps
            for dep in ctx.attr.deps
            if TsConfigInfo in dep
        ])),
    ]

    # Don't provide DeclarationInfo if there are no typings to provide.
    # Improves error messaging if a ts_project needs declaration = True
    if len(typings_outputs) or len(ctx.attr.deps):
        providers.append(declaration_info(depset(typings_outputs), ctx.attr.deps))
        providers.append(OutputGroupInfo(types = depset(typings_outputs)))

    return providers

ts_project = rule(
    implementation = _ts_project_impl,
    attrs = dict(_ATTRS, **_OUTPUTS),
)

def _validate_options_impl(ctx):
    # Bazel won't run our action unless its output is needed, so make a marker file
    # We make it a .d.ts file so we can plumb it to the deps of the ts_project compile.
    marker = ctx.actions.declare_file("%s.optionsvalid.d.ts" % ctx.label.name)

    arguments = ctx.actions.args()
    arguments.add_all([ctx.file.tsconfig.path, marker.path, ctx.attr.target, struct(
        allow_js = ctx.attr.allow_js,
        declaration = ctx.attr.declaration,
        declaration_map = ctx.attr.declaration_map,
        composite = ctx.attr.composite,
        emit_declaration_only = ctx.attr.emit_declaration_only,
        source_map = ctx.attr.source_map,
        incremental = ctx.attr.incremental,
        ts_build_info_file = ctx.attr.ts_build_info_file,
    ).to_json()])

    inputs = ctx.files.extends[:]
    if TsConfigInfo in ctx.attr.tsconfig:
        inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)
    else:
        inputs.append(ctx.file.tsconfig)

    run_node(
        ctx,
        inputs = inputs,
        outputs = [marker],
        arguments = [arguments],
        executable = "validator",
    )
    return [
        _ValidOptionsInfo(marker = marker),
    ]

validate_options = rule(
    implementation = _validate_options_impl,
    attrs = {
        "allow_js": attr.bool(),
        "composite": attr.bool(),
        "declaration": attr.bool(),
        "declaration_map": attr.bool(),
        "emit_declaration_only": attr.bool(),
        "extends": attr.label_list(allow_files = [".json"]),
        "incremental": attr.bool(),
        "source_map": attr.bool(),
        "target": attr.string(),
        "ts_build_info_file": attr.string(),
        "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
        "validator": attr.label(default = Label("//packages/typescript/bin:ts_project_options_validator"), executable = True, cfg = "host"),
    },
)

def _is_ts_src(src, allow_js):
    if not src.endswith(".d.ts") and (src.endswith(".ts") or src.endswith(".tsx")):
        return True
    return allow_js and (src.endswith(".js") or src.endswith(".jsx"))

def _out_paths(srcs, outdir, rootdir, allow_js, ext):
    rootdir_replace_pattern = rootdir + "/" if rootdir else ""
    return [
        _join(outdir, f[:f.rindex(".")].replace(rootdir_replace_pattern, "") + ext)
        for f in srcs
        if _is_ts_src(f, allow_js)
    ]

def ts_project_macro(
        name = "tsconfig",
        tsconfig = None,
        srcs = None,
        args = [],
        deps = [],
        extends = None,
        allow_js = False,
        declaration = False,
        source_map = False,
        declaration_map = False,
        composite = False,
        incremental = False,
        emit_declaration_only = False,
        ts_build_info_file = None,
        tsc = None,
        validate = True,
        supports_workers = False,
        declaration_dir = None,
        out_dir = None,
        root_dir = None,
        link_workspace_root = False,
        **kwargs):
    """Compiles one TypeScript project using `tsc --project`

    This is a drop-in replacement for the `tsc` rule automatically generated for the "typescript"
    package, typically loaded from `@npm//typescript:index.bzl`. Unlike bare `tsc`, this rule understands
    the Bazel interop mechanism (Providers) so that this rule works with others that produce or consume
    TypeScript typings (`.d.ts` files).

    Unlike `ts_library`, this rule is the thinnest possible layer of Bazel interoperability on top
    of the TypeScript compiler. It shifts the burden of configuring TypeScript into the tsconfig.json file.
    See https://github.com/bazelbuild/rules_nodejs/blob/master/docs/TypeScript.md#alternatives
    for more details about the trade-offs between the two rules.

    Some TypeScript options affect which files are emitted, and Bazel wants to know these ahead-of-time.
    So several options from the tsconfig file must be mirrored as attributes to ts_project.
    See https://www.typescriptlang.org/v2/en/tsconfig for a listing of the TypeScript options.

    Any code that works with `tsc` should work with `ts_project` with a few caveats:

    - Bazel requires that the `outDir` (and `declarationDir`) be set to
      `bazel-out/[target architecture]/bin/path/to/package`
      so we override whatever settings appear in your tsconfig.
    - Bazel expects that each output is produced by a single rule.
      Thus if you have two `ts_project` rules with overlapping sources (the same `.ts` file
      appears in more than one) then you get an error about conflicting `.js` output
      files if you try to build both together.
      Worse, if you build them separately then the output directory will contain whichever
      one you happened to build most recently. This is highly discouraged.

    > Note: in order for TypeScript to resolve relative references to the bazel-out folder,
    > we recommend that the base tsconfig contain a rootDirs section that includes all
    > possible locations they may appear.
    >
    > We hope this will not be needed in some future release of TypeScript.
    > Follow https://github.com/microsoft/TypeScript/issues/37257 for more info.
    >
    > For example, if the base tsconfig file relative to the workspace root is
    > `path/to/tsconfig.json` then you should configure like:
    >
    > ```
    > "compilerOptions": {
    >     "rootDirs": [
    >         ".",
    >         "../../bazel-out/darwin-fastbuild/bin/path/to",
    >         "../../bazel-out/k8-fastbuild/bin/path/to",
    >         "../../bazel-out/x64_windows-fastbuild/bin/path/to",
    >         "../../bazel-out/darwin-dbg/bin/path/to",
    >         "../../bazel-out/k8-dbg/bin/path/to",
    >         "../../bazel-out/x64_windows-dbg/bin/path/to",
    >     ]
    > }
    > ```

    ### Issues when running non-sandboxed

    When using a non-sandboxed spawn strategy (which is the default on Windows), you may
    observe these problems which require workarounds:

    1) Bazel deletes outputs from the previous execution before running `tsc`.
       This causes a problem with TypeScript's incremental mode: if the `.tsbuildinfo` file
       is not known to be an output of the rule, then Bazel will leave it in the output
       directory, and when `tsc` runs, it may see that the outputs written by the prior
       invocation are up-to-date and skip the emit of these files. This will cause Bazel
       to intermittently fail with an error that some outputs were not written.
       This is why we depend on `composite` and/or `incremental` attributes to be provided,
       so we can tell Bazel to expect a `.tsbuildinfo` output to ensure it is deleted before a
       subsequent compilation.
       At present, we don't do anything useful with the `.tsbuildinfo` output, and this rule
       does not actually have incremental behavior. Deleting the file is actually
       counter-productive in terms of TypeScript compile performance.
       Follow https://github.com/bazelbuild/rules_nodejs/issues/1726

    2) When using Project References, TypeScript will expect to verify that the outputs of referenced
       projects are up-to-date with respect to their inputs.
       (This is true even without using the `--build` option).
       When using a non-sandboxed spawn strategy, `tsc` can read the sources from other `ts_project`
       rules in your project, and will expect that the `tsconfig.json` file for those references will
       indicate where the outputs were written. However the `outDir` is determined by this Bazel rule so
       it cannot be known from reading the `tsconfig.json` file.
       This problem is manifested as a TypeScript diagnostic like
       `error TS6305: Output file '/path/to/execroot/a.d.ts' has not been built from source file '/path/to/execroot/a.ts'.`
       As a workaround, you can give the Windows "fastbuild" output directory as the `outDir` in your tsconfig file.
       On other platforms, the value isn't read so it does no harm.
       See https://github.com/bazelbuild/rules_nodejs/tree/stable/packages/typescript/test/ts_project as an example.
       We hope this will be fixed in a future release of TypeScript;
       follow https://github.com/microsoft/TypeScript/issues/37378

    3) When TypeScript encounters an import statement, it adds the source file resolved by that reference
       to the program. However you may have included that source file in a different project, so this causes
       the problem mentioned above where a source file is in multiple programs.
       (Note, if you use Project References this is not the case, TS will know the referenced
       file is part of the other program.)
       This will result in duplicate emit for the same file, which produces an error
       since the files written to the output tree are read-only.
       Workarounds include using using Project References, or simply grouping the whole compilation
       into one program (if this doesn't exceed your time budget).

    Args:
        name: A name for the target.

            We recommend you use the basename (no `.json` extension) of the tsconfig file that should be compiled.

        srcs: List of labels of TypeScript source files to be provided to the compiler.

            If absent, defaults to `**/*.ts[x]` (all TypeScript files in the package).

        deps: List of labels of other rules that produce TypeScript typings (.d.ts files)

        tsconfig: Label of the tsconfig.json file to use for the compilation

            To support "chaining" of more than one extended config, this label could be a target that
            provdes `TsConfigInfo` such as `ts_config`.

            By default, we assume the tsconfig file is named by adding `.json` to the `name` attribute.

            EXPERIMENTAL: generated tsconfig

            Instead of a label, you can pass a dictionary of tsconfig keys.

            In this case, a tsconfig.json file will be generated for this compilation, in the following way:
            - all top-level keys will be copied by converting the dict to json.
              So `tsconfig = {"compilerOptions": {"declaration": True}}`
              will result in a generated `tsconfig.json` with `{"compilerOptions": {"declaration": true}}`
            - each file in srcs will be converted to a relative path in the `files` section.
            - the `extends` attribute will be converted to a relative path

            Note that you can mix and match attributes and compilerOptions properties, so these are equivalent:

            ```
            ts_project(
                tsconfig = {
                    "compilerOptions": {
                        "declaration": True,
                    },
                },
            )
            ```
            and
            ```
            ts_project(
                declaration = True,
            )
            ```

        extends: Label of the tsconfig file referenced in the `extends` section of tsconfig

            To support "chaining" of more than one extended config, this label could be a target that
            provdes `TsConfigInfo` such as `ts_config`.

            _DEPRECATED, to be removed in 3.0_:
            For backwards compatibility, this accepts a list of Labels of the "chained"
            tsconfig files. You should instead use a single Label of a `ts_config` target.
            Follow this deprecation: https://github.com/bazelbuild/rules_nodejs/issues/2140

        args: List of strings of additional command-line arguments to pass to tsc.

        tsc: Label of the TypeScript compiler binary to run.

            For example, `tsc = "@my_deps//typescript/bin:tsc"`
            Or you can pass a custom compiler binary instead.

        validate: boolean; whether to check that the tsconfig settings match the attributes.

        supports_workers: Experimental! Use only with caution.

            Allows you to enable the Bazel Worker strategy for this project.
            This requires that the tsc binary support it.

        root_dir: a string specifying a subdirectory under the input package which should be consider the
            root directory of all the input files.
            Equivalent to the TypeScript --rootDir option.
            By default it is '.', meaning the source directory where the BUILD file lives.

        out_dir: a string specifying a subdirectory under the bazel-out folder where outputs are written.
            Equivalent to the TypeScript --outDir option.
            Note that Bazel always requires outputs be written under a subdirectory matching the input package,
            so if your rule appears in path/to/my/package/BUILD.bazel and out_dir = "foo" then the .js files
            will appear in bazel-out/[arch]/bin/path/to/my/package/foo/*.js.
            By default the out_dir is '.', meaning the packages folder in bazel-out.

        allow_js: boolean; Specifies whether TypeScript will read .js and .jsx files. When used with declaration,
            TypeScript will generate .d.ts files from .js files.

        declaration_dir: a string specifying a subdirectory under the bazel-out folder where generated declaration
            outputs are written. Equivalent to the TypeScript --declarationDir option.
            By default declarations are written to the out_dir.

        declaration: if the `declaration` bit is set in the tsconfig.
            Instructs Bazel to expect a `.d.ts` output for each `.ts` source.
        source_map: if the `sourceMap` bit is set in the tsconfig.
            Instructs Bazel to expect a `.js.map` output for each `.ts` source.
        declaration_map: if the `declarationMap` bit is set in the tsconfig.
            Instructs Bazel to expect a `.d.ts.map` output for each `.ts` source.
        composite: if the `composite` bit is set in the tsconfig.
            Instructs Bazel to expect a `.tsbuildinfo` output and a `.d.ts` output for each `.ts` source.
        incremental: if the `incremental` bit is set in the tsconfig.
            Instructs Bazel to expect a `.tsbuildinfo` output.
        emit_declaration_only: if the `emitDeclarationOnly` bit is set in the tsconfig.
            Instructs Bazel *not* to expect `.js` or `.js.map` outputs for `.ts` sources.
        ts_build_info_file: the user-specified value of `tsBuildInfoFile` from the tsconfig.
            Helps Bazel to predict the path where the .tsbuildinfo output is written.

        link_workspace_root: Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
            If source files need to be required then they can be copied to the bin_dir with copy_to_bin.

        **kwargs: passed through to underlying rule, allows eg. visibility, tags
    """

    if srcs == None:
        if allow_js == True:
            srcs = native.glob(["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"])
        else:
            srcs = native.glob(["**/*.ts", "**/*.tsx"])
    extra_deps = []

    if type(tsconfig) == type(dict()):
        # Opt-in to #2140 breaking change at the same time you opt-in to experimental tsconfig dict
        if type(extends) == type([]):
            fail("when tsconfig is a dict, extends should have a single value")

        # Copy attributes <-> tsconfig properties
        # TODO: fail if compilerOptions includes a conflict with an attribute?
        compiler_options = tsconfig.setdefault("compilerOptions", {})
        source_map = compiler_options.setdefault("sourceMap", source_map)
        declaration = compiler_options.setdefault("declaration", declaration)
        declaration_map = compiler_options.setdefault("declarationMap", declaration_map)
        emit_declaration_only = compiler_options.setdefault("emitDeclarationOnly", emit_declaration_only)
        allow_js = compiler_options.setdefault("allowJs", allow_js)

        # These options are always passed on the tsc command line so don't include them
        # in the tsconfig. At best they're redundant, but at worst we'll have a conflict
        if "outDir" in compiler_options.keys():
            out_dir = compiler_options.pop("outDir")
        if "declarationDir" in compiler_options.keys():
            declaration_dir = compiler_options.pop("declarationDir")
        if "rootDir" in compiler_options.keys():
            root_dir = compiler_options.pop("rootDir")

        # FIXME: need to remove keys that have a None value?
        write_tsconfig(
            name = "_gen_tsconfig_%s" % name,
            config = tsconfig,
            files = srcs,
            extends = Label("//%s:%s" % (native.package_name(), name)).relative(extends) if extends else None,
            out = "tsconfig_%s.json" % name,
        )

        # From here, tsconfig becomes a file, the same as if the
        # user supplied a tsconfig.json InputArtifact
        tsconfig = "tsconfig_%s.json" % name

    else:
        if tsconfig == None:
            tsconfig = name + ".json"

        if validate:
            validate_options(
                name = "_validate_%s_options" % name,
                target = "//%s:%s" % (native.package_name(), name),
                declaration = declaration,
                source_map = source_map,
                declaration_map = declaration_map,
                composite = composite,
                incremental = incremental,
                ts_build_info_file = ts_build_info_file,
                emit_declaration_only = emit_declaration_only,
                allow_js = allow_js,
                tsconfig = tsconfig,
                extends = extends,
            )
            extra_deps.append("_validate_%s_options" % name)

    if supports_workers:
        tsc_worker = "%s_worker" % name
        protobufjs = (
            # BEGIN-INTERNAL
            "@npm" +
            # END-INTERNAL
            "//protobufjs"
        )
        nodejs_binary(
            name = tsc_worker,
            data = [
                Label("//packages/typescript/internal/worker:worker"),
                Label(_DEFAULT_TSC_BIN),
                Label(protobufjs),
                tsconfig,
            ],
            entry_point = Label("//packages/typescript/internal/worker:worker_adapter"),
            templated_args = [
                "--nobazel_patch_module_resolver",
                "$(execpath {})".format(Label(_DEFAULT_TSC_BIN)),
                "--project",
                "$(execpath {})".format(tsconfig),
                # FIXME: should take out_dir into account
                "--outDir",
                "$(RULEDIR)",
                # FIXME: what about other settings like declaration_dir, root_dir, etc
                "--watch",
            ],
        )

        tsc = ":" + tsc_worker

    typings_out_dir = declaration_dir if declaration_dir else out_dir
    tsbuildinfo_path = ts_build_info_file if ts_build_info_file else name + ".tsbuildinfo"

    # Backcompat for extends as a list, to cleanup in #2140
    if (type(extends) == type("")):
        extends = [extends]

    ts_project(
        name = name,
        srcs = srcs,
        args = args,
        deps = deps + extra_deps,
        tsconfig = tsconfig,
        extends = extends,
        declaration_dir = declaration_dir,
        out_dir = out_dir,
        root_dir = root_dir,
        js_outs = _out_paths(srcs, out_dir, root_dir, False, ".js") if not emit_declaration_only else [],
        map_outs = _out_paths(srcs, out_dir, root_dir, False, ".js.map") if source_map and not emit_declaration_only else [],
        typings_outs = _out_paths(srcs, typings_out_dir, root_dir, allow_js, ".d.ts") if declaration or composite else [],
        typing_maps_outs = _out_paths(srcs, typings_out_dir, root_dir, allow_js, ".d.ts.map") if declaration_map else [],
        buildinfo_out = tsbuildinfo_path if composite or incremental else None,
        tsc = tsc,
        link_workspace_root = link_workspace_root,
        supports_workers = select({
            "@bazel_tools//src/conditions:host_windows": False,
            "//conditions:default": supports_workers,
        }),
        **kwargs
    )
