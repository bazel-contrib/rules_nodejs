"ts_project rule"

load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "NpmPackageInfo", "declaration_info", "js_module_info", "run_node")

_DEFAULT_TSC = (
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//typescript/bin:tsc"
)

_ATTRS = {
    "args": attr.string_list(),
    "deps": attr.label_list(providers = [DeclarationInfo]),
    "extends": attr.label_list(allow_files = [".json"]),
    "outdir": attr.string(),
    # NB: no restriction on extensions here, because tsc sometimes adds type-check support
    # for more file kinds (like require('some.json')) and also
    # if you swap out the `compiler` attribute (like with ngtsc)
    # that compiler might allow more sources than tsc does.
    "srcs": attr.label_list(allow_files = True, mandatory = True),
    "tsc": attr.label(default = Label(_DEFAULT_TSC), executable = True, cfg = "host"),
    "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
}

# tsc knows how to produce the following kinds of output files.
# NB: the macro `ts_project_macro` will set these outputs based on user
# telling us which settings are enabled in the tsconfig for this project.
_OUTPUTS = {
    "buildinfo_out": attr.output(),
    "js_outs": attr.output_list(),
    "json_outs": attr.output_list(),
    "map_outs": attr.output_list(),
    "typing_maps_outs": attr.output_list(),
    "typings_outs": attr.output_list(),
}

_TsConfigInfo = provider(
    doc = """Passes tsconfig.json files to downstream compilations so that TypeScript can read them.
        This is needed to support Project References""",
    fields = {
        "tsconfigs": "depset of tsconfig.json files",
    },
)

def _join(*elements):
    return "/".join([f for f in elements if f])

def _ts_project_impl(ctx):
    arguments = ctx.actions.args()

    # Add user specified arguments *before* rule supplied arguments
    arguments.add_all(ctx.attr.args)

    arguments.add_all([
        "--project",
        ctx.file.tsconfig.path,
        "--outDir",
        _join(ctx.bin_dir.path, ctx.label.package, ctx.attr.outdir),
        # Make sure TypeScript writes outputs to same directory structure as inputs
        "--rootDir",
        ctx.label.package if ctx.label.package else ".",
    ])
    if len(ctx.outputs.typings_outs) > 0:
        arguments.add_all([
            "--declarationDir",
            _join(ctx.bin_dir.path, ctx.label.package, ctx.attr.outdir),
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
    for dep in ctx.attr.deps:
        if _TsConfigInfo in dep:
            deps_depsets.append(dep[_TsConfigInfo].tsconfigs)
        if NpmPackageInfo in dep:
            # TODO: we could maybe filter these to be tsconfig.json or *.d.ts only
            # we don't expect tsc wants to read any other files from npm packages.
            deps_depsets.append(dep[NpmPackageInfo].sources)
        if DeclarationInfo in dep:
            deps_depsets.append(dep[DeclarationInfo].transitive_declarations)

    inputs = ctx.files.srcs + depset(transitive = deps_depsets).to_list() + [ctx.file.tsconfig]
    if ctx.attr.extends:
        inputs.extend(ctx.files.extends)

    json_outs = ctx.outputs.json_outs

    # If there are no predeclared json_outs (probably bc of no .json or no outdir),
    # let's try to search for them in srcs so we can declare them as output
    if not json_outs:
        json_outs = [ctx.actions.declare_file(src.basename, sibling = src) for src in ctx.files.srcs if src.basename.endswith(".json")]
    outputs = json_outs + ctx.outputs.js_outs + ctx.outputs.map_outs + ctx.outputs.typings_outs + ctx.outputs.typing_maps_outs
    if ctx.outputs.buildinfo_out:
        outputs.append(ctx.outputs.buildinfo_out)
    runtime_outputs = depset(json_outs + ctx.outputs.js_outs + ctx.outputs.map_outs)
    typings_outputs = ctx.outputs.typings_outs + [s for s in ctx.files.srcs if s.path.endswith(".d.ts")]

    if len(outputs) > 0:
        run_node(
            ctx,
            inputs = inputs,
            arguments = [arguments],
            outputs = outputs,
            executable = "tsc",
            progress_message = "Compiling TypeScript project %s [tsc -p %s]" % (
                ctx.label,
                ctx.file.tsconfig.short_path,
            ),
        )

    providers = [
        # DefaultInfo is what you see on the command-line for a built library,
        # and determines what files are used by a simple non-provider-aware
        # downstream library.
        # Only the JavaScript outputs are intended for use in non-TS-aware
        # dependents.
        DefaultInfo(
            files = runtime_outputs,
            runfiles = ctx.runfiles(
                transitive_files = runtime_outputs,
                collect_default = True,
            ),
        ),
        js_module_info(
            sources = runtime_outputs,
            deps = ctx.attr.deps,
        ),
        _TsConfigInfo(tsconfigs = depset([ctx.file.tsconfig] + ctx.files.extends, transitive = [
            dep[_TsConfigInfo].tsconfigs
            for dep in ctx.attr.deps
            if _TsConfigInfo in dep
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
        declaration = ctx.attr.declaration,
        declaration_map = ctx.attr.declaration_map,
        composite = ctx.attr.composite,
        emit_declaration_only = ctx.attr.emit_declaration_only,
        source_map = ctx.attr.source_map,
        incremental = ctx.attr.incremental,
    ).to_json()])

    run_node(
        ctx,
        inputs = [ctx.file.tsconfig] + ctx.files.extends,
        outputs = [marker],
        arguments = [arguments],
        executable = "validator",
    )
    return [
        DeclarationInfo(
            transitive_declarations = depset([marker]),
        ),
    ]

validate_options = rule(
    implementation = _validate_options_impl,
    attrs = {
        "composite": attr.bool(),
        "declaration": attr.bool(),
        "declaration_map": attr.bool(),
        "emit_declaration_only": attr.bool(),
        "extends": attr.label_list(allow_files = [".json"]),
        "incremental": attr.bool(),
        "source_map": attr.bool(),
        "target": attr.string(),
        "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
        "validator": attr.label(default = Label("//packages/typescript/bin:ts_project_options_validator"), executable = True, cfg = "host"),
    },
)

def _out_paths(srcs, outdir, ext):
    return [_join(outdir, f[:f.rindex(".")] + ext) for f in srcs if not f.endswith(".d.ts") and not f.endswith(".json")]

def ts_project_macro(
        name = "tsconfig",
        tsconfig = None,
        srcs = None,
        args = [],
        deps = [],
        extends = None,
        declaration = False,
        source_map = False,
        declaration_map = False,
        composite = False,
        incremental = False,
        emit_declaration_only = False,
        tsc = None,
        validate = True,
        outdir = None,
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
       See https://github.com/bazelbuild/rules_nodejs/tree/master/packages/typescript/test/ts_project as an example.
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

        tsconfig: Label of the tsconfig.json file to use for the compilation.

            By default, we add `.json` to the `name` attribute.

        extends: List of labels of tsconfig file(s) referenced in `extends` section of tsconfig.

            Must include any tsconfig files "chained" by extends clauses.

        args: List of strings of additional command-line arguments to pass to tsc.

        tsc: Label of the TypeScript compiler binary to run.

            For example, `tsc = "@my_deps//typescript/bin:tsc"`
            Or you can pass a custom compiler binary instead.

        validate: boolean; whether to check that the tsconfig settings match the attributes.

        outdir: a string specifying a subdirectory under the bazel-out folder where outputs are written.
            Note that Bazel always requires outputs be written under a subdirectory matching the input package,
            so if your rule appears in path/to/my/package/BUILD.bazel and outdir = "foo" then the .js files
            will appear in bazel-out/[arch]/bin/path/to/my/package/foo/*.js

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
    """

    if srcs == None:
        srcs = native.glob(["**/*.ts", "**/*.tsx"])

    if tsconfig == None:
        tsconfig = name + ".json"

    extra_deps = []

    if validate:
        validate_options(
            name = "_validate_%s_options" % name,
            target = "//%s:%s" % (native.package_name(), name),
            declaration = declaration,
            source_map = source_map,
            declaration_map = declaration_map,
            composite = composite,
            incremental = incremental,
            emit_declaration_only = emit_declaration_only,
            tsconfig = tsconfig,
            extends = extends,
        )
        extra_deps.append("_validate_%s_options" % name)

    ts_project(
        name = name,
        srcs = srcs,
        args = args,
        deps = deps + extra_deps,
        tsconfig = tsconfig,
        extends = extends,
        outdir = outdir,
        # JSON files are special. They are output if outdir is set since tsc will
        # copy them to outdir. Otherwise they are kind of both.
        json_outs = [_join(outdir, f) for f in srcs if f.endswith(".json")] if outdir and not emit_declaration_only else [],
        js_outs = _out_paths(srcs, outdir, ".js") if not emit_declaration_only else [],
        map_outs = _out_paths(srcs, outdir, ".js.map") if source_map and not emit_declaration_only else [],
        typings_outs = _out_paths(srcs, outdir, ".d.ts") if declaration or composite else [],
        typing_maps_outs = _out_paths(srcs, outdir, ".d.ts.map") if declaration_map else [],
        buildinfo_out = tsconfig[:-5] + ".tsbuildinfo" if composite or incremental else None,
        tsc = tsc,
        **kwargs
    )
