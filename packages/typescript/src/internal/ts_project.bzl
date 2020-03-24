"ts_project rule"

load("@build_bazel_rules_nodejs//:providers.bzl", "DeclarationInfo", "NpmPackageInfo", "run_node")

_ATTRS = {
    # NB: no restriction on extensions here, because tsc sometimes adds type-check support
    # for more file kinds (like require('some.json')) and also
    # if you swap out the `compiler` attribute (like with ngtsc)
    # that compiler might allow more sources than tsc does.
    "srcs": attr.label_list(allow_files = True, mandatory = True),
    "extends": attr.label_list(allow_files = [".json"]),
    "tsc": attr.label(default = Label("@npm//typescript/bin:tsc"), executable = True, cfg = "host"),
    "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
    "deps": attr.label_list(providers = [DeclarationInfo]),
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

_TsConfigInfo = provider(
    doc = """Passes tsconfig.json files to downstream compilations so that TypeScript can read them.
        This is needed to support Project References""",
    fields = {
        "tsconfigs": "depset of tsconfig.json files",
    },
)

def _ts_project_impl(ctx):
    arguments = ctx.actions.args()
    arguments.add_all([
        "-p",
        ctx.file.tsconfig.short_path,
        "--outDir",
        "/".join([ctx.bin_dir.path, ctx.label.package]),
    ])
    if len(ctx.outputs.typings_outs) > 0:
        arguments.add_all([
            "--declarationDir",
            "/".join([ctx.bin_dir.path, ctx.label.package]),
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
        elif DeclarationInfo in dep:
            deps_depsets.append(dep[DeclarationInfo].transitive_declarations)

    inputs = ctx.files.srcs + depset(transitive = deps_depsets).to_list() + [ctx.file.tsconfig]
    if ctx.attr.extends:
        inputs.extend(ctx.files.extends)
    outputs = ctx.outputs.js_outs + ctx.outputs.map_outs + ctx.outputs.typings_outs + ctx.outputs.typing_maps_outs
    if ctx.outputs.buildinfo_out:
        outputs.append(ctx.outputs.buildinfo_out)

    if len(outputs) == 0:
        return []

    run_node(
        ctx,
        inputs = inputs,
        arguments = [arguments],
        outputs = outputs,
        executable = "tsc",
        progress_message = "Compiling TypeScript project %s" % ctx.file.tsconfig.short_path,
    )

    runtime_files = depset(ctx.outputs.js_outs + ctx.outputs.map_outs)
    typings_files = ctx.outputs.typings_outs + [s for s in ctx.files.srcs if s.path.endswith(".d.ts")]

    return [
        DeclarationInfo(
            declarations = depset(typings_files),
            transitive_declarations = depset(typings_files, transitive = [
                dep[DeclarationInfo].transitive_declarations
                for dep in ctx.attr.deps
            ]),
        ),
        DefaultInfo(
            files = runtime_files,
            runfiles = ctx.runfiles(
                transitive_files = runtime_files,
                collect_default = True,
            ),
        ),
        _TsConfigInfo(tsconfigs = depset([ctx.file.tsconfig], transitive = [
            dep[_TsConfigInfo].tsconfigs
            for dep in ctx.attr.deps
            if _TsConfigInfo in dep
        ])),
    ]

ts_project = rule(
    implementation = _ts_project_impl,
    attrs = dict(_ATTRS, **_OUTPUTS),
)

def _out_paths(srcs, ext):
    return [f[:f.rindex(".")] + ext for f in srcs if not f.endswith(".d.ts")]

def ts_project_macro(
        name = "tsconfig",
        tsconfig = None,
        srcs = None,
        deps = [],
        extends = None,
        declaration = False,
        source_map = False,
        declaration_map = False,
        composite = False,
        incremental = False,
        emit_declaration_only = False,
        tsc = "@npm//typescript/bin:tsc",
        **kwargs):
    """Compiles one TypeScript project using `tsc -p`

    Unlike `ts_library`, this rule is the thinnest possible layer of Bazel interoperability on top
    of the TypeScript compiler. It shifts the burden of configuring TypeScript into the tsconfig.json file.
    TODO(alexeagle): update https://github.com/bazelbuild/rules_nodejs/blob/master/docs/TypeScript.md#alternatives
    to describe the trade-offs between the two rules.

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

    > Note: when using a non-sandboxed spawn strategy (which is the default on Windows),
    > Bazel deletes outputs from the previous execution before running `tsc`.
    > This causes a problem with TypeScript's incremental mode: if the `.tsbuildinfo` file
    > is not known to be an output of the rule, then Bazel will leave it in the output
    > directory, and when `tsc` runs, it may see that the outputs written by the prior
    > invocation are up-to-date and skip the emit of these files. This will cause Bazel
    > to intermittently fail with an error that some outputs were not written.
    > This is why we depend on
    > `composite` and/or `incremental` attributes to be provided, so we can tell Bazel to
    > expect a `.tsbuildinfo` output to ensure it is deleted before a subsequent compilation.
    > At present, we don't do anything useful with the `.tsbuildinfo` output, and this rule
    > does not actually have incremental behavior. Deleting the file is actually
    > counter-productive in terms of TypeScript compile performance.
    > Follow https://github.com/bazelbuild/rules_nodejs/issues/1726

    > Note: When using Project References, TypeScript will expect to verify that the outputs of referenced
    > projects are up-to-date with respect to their inputs (this is true even without using the `--build` option).
    > When using a non-sandboxed spawn strategy, `tsc` can read the sources from other `ts_project`
    > rules in your project, and will expect that the `tsconfig.json` file for those references will
    > indicate where the outputs were written. However the `outDir` is determined by this Bazel rule so
    > it cannot be known from reading the `tsconfig.json` file.
    > This problem is manifested as a TypeScript diagnostic like
    > `error TS6305: Output file '/path/to/execroot/a.d.ts' has not been built from source file '/path/to/execroot/a.ts'.`
    > As a workaround, you can give the Windows "fastbuild" output directory as the `outDir` in your tsconfig file.
    > On other platforms, the value isn't read so it does no harm.
    > See https://github.com/bazelbuild/rules_nodejs/tree/master/packages/typescript/test/ts_project as an example.
    > We hope this will be fixed in a future release of TypeScript;
    > follow https://github.com/microsoft/TypeScript/issues/37378

    Args:
        name: A name for the target.

            We recommend you use the basename (no `.json` extension) of the tsconfig file that should be compiled.

        srcs: List of labels of TypeScript source files to be provided to the compiler.

            If absent, defaults to `**/*.ts` (all TypeScript files in the package).

        deps: List of labels of other rules that produce TypeScript typings (.d.ts files)

        tsconfig: Label of the tsconfig.json file to use for the compilation.

            By default, we add `.json` to the `name` attribute.

        extends: List of labels of tsconfig file(s) referenced in `extends` section of tsconfig.

            Must include any tsconfig files "chained" by extends clauses.

        tsc: Label of the TypeScript compiler binary to run.

            Override this if your npm_install or yarn_install isn't named "npm"
            For example, `tsc = "@my_deps//typescript/bin:tsc"`
            Or you can pass a custom compiler binary instead.

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
        srcs = native.glob(["**/*.ts"])

    if tsconfig == None:
        tsconfig = name + ".json"

    ts_project(
        name = name,
        srcs = srcs,
        deps = deps,
        tsconfig = tsconfig,
        extends = extends,
        js_outs = _out_paths(srcs, ".js") if not emit_declaration_only else [],
        map_outs = _out_paths(srcs, ".js.map") if source_map and not emit_declaration_only else [],
        typings_outs = _out_paths(srcs, ".d.ts") if declaration or composite else [],
        typing_maps_outs = _out_paths(srcs, ".d.ts.map") if declaration_map else [],
        buildinfo_out = tsconfig[:-5] + ".tsbuildinfo" if composite or incremental else None,
        tsc = tsc,
        **kwargs
    )
