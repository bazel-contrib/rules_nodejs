"ts_project rule"

load("@rules_nodejs//nodejs:providers.bzl", "DeclarationInfo", "declaration_info", "js_module_info")
load("@build_bazel_rules_nodejs//:providers.bzl", "ExternalNpmPackageInfo", "run_node")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect")
load(":ts_config.bzl", "TsConfigInfo")
load(":validate_options.bzl", "ValidOptionsInfo", _validate_lib = "lib")

_DEFAULT_TSC = (
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//typescript/bin:tsc"
)

_ATTRS = dict(_validate_lib.attrs, **{
    "args": attr.string_list(),
    "data": attr.label_list(default = [], allow_files = True),
    "declaration_dir": attr.string(),
    "deps": attr.label_list(
        providers = [
            # Provide one or the other of these
            [DeclarationInfo],
            [ValidOptionsInfo],
        ],
        aspects = [module_mappings_aspect],
    ),
    "link_workspace_root": attr.bool(),
    "out_dir": attr.string(),
    "root_dir": attr.string(),
    # NB: no restriction on extensions here, because tsc sometimes adds type-check support
    # for more file kinds (like require('some.json')) and also
    # if you swap out the `compiler` attribute (like with ngtsc)
    # that compiler might allow more sources than tsc does.
    "srcs": attr.label_list(allow_files = True, mandatory = True),
    "supports_workers": attr.bool(default = False),
    "tsc": attr.label(default = Label(_DEFAULT_TSC), executable = True, cfg = "exec"),
    "transpile": attr.bool(doc = "whether tsc should be used to produce .js outputs", default = True),
    "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
})

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

def _relative_to_package(path, ctx):
    for prefix in (ctx.bin_dir.path, ctx.label.package):
        prefix += "/"
        if path.startswith(prefix):
            path = path[len(prefix):]
    return path

def _declare_outputs(ctx, paths):
    return [
        ctx.actions.declare_file(path)
        for path in paths
    ]

def _calculate_root_dir(ctx):
    some_generated_path = None
    some_source_path = None
    root_path = None

    # Note we don't have access to the ts_project macro allow_js param here.
    # For error-handling purposes, we can assume that any .js/.jsx
    # input is meant to be in the rootDir alongside .ts/.tsx sources,
    # whether the user meant for them to be sources or not.
    # It's a non-breaking change to relax this constraint later, but would be
    # a breaking change to restrict it further.
    allow_js = True
    for src in ctx.files.srcs:
        if _is_ts_src(src.path, allow_js):
            if src.is_source:
                some_source_path = src.path
            else:
                some_generated_path = src.path
                root_path = ctx.bin_dir.path

    if some_source_path and some_generated_path:
        fail("ERROR: %s srcs cannot be a mix of generated files and source files " % ctx.label +
             "since this would prevent giving a single rootDir to the TypeScript compiler\n" +
             "    found generated file %s and source file %s" %
             (some_generated_path, some_source_path))

    return _join(
        root_path,
        ctx.label.workspace_root,
        ctx.label.package,
        ctx.attr.root_dir,
    )

def _ts_project_impl(ctx):
    srcs = [_relative_to_package(src.path, ctx) for src in ctx.files.srcs]

    # Recalculate outputs inside the rule implementation.
    # The outs are first calculated in the macro in order to try to predetermine outputs so they can be declared as
    # outputs on the rule. This provides the benefit of being able to reference an output file with a label.
    # However, it is not possible to evaluate files in outputs of other rules such as filegroup, therefore the outs are
    # recalculated here.
    typings_out_dir = ctx.attr.declaration_dir or ctx.attr.out_dir
    js_outs = _declare_outputs(ctx, [] if not ctx.attr.transpile else _calculate_js_outs(srcs, ctx.attr.out_dir, ctx.attr.root_dir, ctx.attr.allow_js, ctx.attr.preserve_jsx, ctx.attr.emit_declaration_only))
    map_outs = _declare_outputs(ctx, [] if not ctx.attr.transpile else _calculate_map_outs(srcs, ctx.attr.out_dir, ctx.attr.root_dir, ctx.attr.source_map, ctx.attr.preserve_jsx, ctx.attr.emit_declaration_only))
    typings_outs = _declare_outputs(ctx, _calculate_typings_outs(srcs, typings_out_dir, ctx.attr.root_dir, ctx.attr.declaration, ctx.attr.composite, ctx.attr.allow_js))
    typing_maps_outs = _declare_outputs(ctx, _calculate_typing_maps_outs(srcs, typings_out_dir, ctx.attr.root_dir, ctx.attr.declaration_map, ctx.attr.allow_js))

    arguments = ctx.actions.args()
    execution_requirements = {}
    progress_prefix = "Compiling TypeScript project"

    if ctx.attr.supports_workers:
        # Set to use a multiline param-file for worker mode
        arguments.use_param_file("@%s", use_always = True)
        arguments.set_param_file_format("multiline")
        execution_requirements["supports-workers"] = "1"
        execution_requirements["worker-key-mnemonic"] = "TsProject"
        progress_prefix = "Compiling TypeScript project (worker mode)"

    # Add user specified arguments *before* rule supplied arguments
    arguments.add_all(ctx.attr.args)

    arguments.add_all([
        "--project",
        ctx.file.tsconfig.path,
        "--outDir",
        _join(ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package, ctx.attr.out_dir),
        "--rootDir",
        _calculate_root_dir(ctx),
    ])
    if len(typings_outs) > 0:
        declaration_dir = ctx.attr.declaration_dir if ctx.attr.declaration_dir else ctx.attr.out_dir
        arguments.add_all([
            "--declarationDir",
            _join(ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package, declaration_dir),
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
        if ExternalNpmPackageInfo in dep:
            # TODO: we could maybe filter these to be tsconfig.json or *.d.ts only
            # we don't expect tsc wants to read any other files from npm packages.
            deps_depsets.append(dep[ExternalNpmPackageInfo].sources)
        if DeclarationInfo in dep:
            deps_depsets.append(dep[DeclarationInfo].transitive_declarations)
        if ValidOptionsInfo in dep:
            inputs.append(dep[ValidOptionsInfo].marker)

    inputs.extend(depset(transitive = deps_depsets).to_list())

    # Gather TsConfig info from both the direct (tsconfig) and indirect (extends) attribute
    tsconfig_inputs = _validate_lib.tsconfig_inputs(ctx)
    inputs.extend(tsconfig_inputs)

    # We do not try to predeclare json_outs, because their output locations generally conflict with their path in the source tree.
    # (The exception is when out_dir is used, then the .json output is a different path than the input.)
    # However tsc will copy .json srcs to the output tree so we want to declare these outputs to include along with .js Default outs
    # NB: We don't have emit_declaration_only setting here, so use presence of any JS outputs as an equivalent.
    # tsc will only produce .json if it also produces .js
    if len(js_outs):
        pkg_len = len(ctx.label.package) + 1 if len(ctx.label.package) else 0
        json_outs = [
            ctx.actions.declare_file(_join(ctx.attr.out_dir, src.short_path[pkg_len:]))
            for src in ctx.files.srcs
            if src.basename.endswith(".json") and src.is_source
        ]
    else:
        json_outs = []

    outputs = json_outs + js_outs + map_outs + typings_outs + typing_maps_outs
    if ctx.outputs.buildinfo_out:
        arguments.add_all([
            "--tsBuildInfoFile",
            ctx.outputs.buildinfo_out.path,
        ])
        outputs.append(ctx.outputs.buildinfo_out)
    runtime_outputs = json_outs + js_outs + map_outs
    typings_outputs = typings_outs + typing_maps_outs + [s for s in ctx.files.srcs if s.path.endswith(".d.ts")]

    if not js_outs and not typings_outputs and not ctx.attr.deps:
        label = "//{}:{}".format(ctx.label.package, ctx.label.name)
        if ctx.attr.transpile:
            no_outs_msg = """ts_project target %s is configured to produce no outputs.

This might be because
- you configured it with `noEmit`
- the `srcs` are empty
""" % label
        else:
            no_outs_msg = "ts_project target %s with custom transpiler needs `declaration = True`." % label
        fail(no_outs_msg + """
This is an error because Bazel does not run actions unless their outputs are needed for the requested targets to build.
""")

    if ctx.attr.transpile:
        default_outputs_depset = depset(runtime_outputs) if len(runtime_outputs) else depset(typings_outputs)
    else:
        # We must avoid tsc writing any JS files in this case, as tsc was only run for typings, and some other
        # action will try to write the JS files. We must avoid collisions where two actions write the same file.
        arguments.add("--emitDeclarationOnly")

        # We don't produce any DefaultInfo outputs in this case, because we avoid running the tsc action
        # unless the DeclarationInfo is requested.
        default_outputs_depset = depset([])

    if len(outputs) > 0:
        run_node(
            ctx,
            inputs = inputs,
            arguments = [arguments],
            outputs = outputs,
            mnemonic = "TsProject",
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
                transitive_files = depset(ctx.files.data, transitive = [
                    default_outputs_depset,
                ]),
                collect_default = True,
            ),
        ),
        js_module_info(
            sources = depset(runtime_outputs),
            deps = ctx.attr.deps,
        ),
        TsConfigInfo(deps = depset(tsconfig_inputs, transitive = [
            dep[TsConfigInfo].deps
            for dep in ctx.attr.deps
            if TsConfigInfo in dep
        ])),
        coverage_common.instrumented_files_info(
            ctx,
            source_attributes = ["srcs"],
            dependency_attributes = ["deps"],
            extensions = ["ts", "tsx"],
        ),
    ]

    # Only provide DeclarationInfo if there are some typings.
    # Improves error messaging if a ts_project is missing declaration = True
    typings_in_deps = [d for d in ctx.attr.deps if DeclarationInfo in d]
    if len(typings_outputs) or len(typings_in_deps):
        providers.append(declaration_info(depset(typings_outputs), typings_in_deps))
        providers.append(OutputGroupInfo(types = depset(typings_outputs)))

    return providers

ts_project = rule(
    implementation = _ts_project_impl,
    attrs = dict(_ATTRS, **_OUTPUTS),
)

def _is_ts_src(src, allow_js):
    if not src.endswith(".d.ts") and (src.endswith(".ts") or src.endswith(".tsx")):
        return True
    return allow_js and (src.endswith(".js") or src.endswith(".jsx"))

def _is_json_src(src, resolve_json_module):
    return resolve_json_module and src.endswith(".json")

def _replace_ext(f, ext_map):
    cur_ext = f[f.rindex("."):]
    new_ext = ext_map.get(cur_ext)
    if new_ext != None:
        return new_ext
    new_ext = ext_map.get("*")
    if new_ext != None:
        return new_ext
    return None

def _out_paths(srcs, out_dir, root_dir, allow_js, ext_map):
    rootdir_replace_pattern = root_dir + "/" if root_dir else ""
    outs = []
    for f in srcs:
        if _is_ts_src(f, allow_js):
            out = _join(out_dir, f[:f.rindex(".")].replace(rootdir_replace_pattern, "") + _replace_ext(f, ext_map))

            # Don't declare outputs that collide with inputs
            # for example, a.js -> a.js
            if out != f:
                outs.append(out)
    return outs

def _calculate_js_outs(srcs, out_dir, root_dir, allow_js, preserve_jsx, emit_declaration_only):
    if emit_declaration_only:
        return []

    exts = {
        "*": ".js",
        ".jsx": ".jsx",
        ".tsx": ".jsx",
    } if preserve_jsx else {"*": ".js"}
    return _out_paths(srcs, out_dir, root_dir, allow_js, exts)

def _calculate_map_outs(srcs, out_dir, root_dir, source_map, preserve_jsx, emit_declaration_only):
    if not source_map or emit_declaration_only:
        return []

    exts = {
        "*": ".js.map",
        ".tsx": ".jsx.map",
    } if preserve_jsx else {"*": ".js.map"}
    return _out_paths(srcs, out_dir, root_dir, False, exts)

def _calculate_typings_outs(srcs, typings_out_dir, root_dir, declaration, composite, allow_js, include_srcs = True):
    if not (declaration or composite):
        return []

    return _out_paths(srcs, typings_out_dir, root_dir, allow_js, {"*": ".d.ts"})

def _calculate_typing_maps_outs(srcs, typings_out_dir, root_dir, declaration_map, allow_js):
    if not declaration_map:
        return []

    exts = {"*": ".d.ts.map"}
    return _out_paths(srcs, typings_out_dir, root_dir, allow_js, exts)

lib = struct(
    is_ts_src = _is_ts_src,
    is_json_src = _is_json_src,
    out_paths = _out_paths,
    calculate_js_outs = _calculate_js_outs,
    calculate_map_outs = _calculate_map_outs,
    calculate_typings_outs = _calculate_typings_outs,
    calculate_typing_maps_outs = _calculate_typing_maps_outs,
)
