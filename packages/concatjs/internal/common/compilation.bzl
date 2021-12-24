# Copyright 2017 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Used for compilation by the different implementations of build_defs.bzl.
"""

load("@rules_nodejs//nodejs:providers.bzl", "DeclarationInfo")
load(":common/json_marshal.bzl", "json_marshal")
load(":common/module_mappings.bzl", "module_mappings_aspect")

_DEBUG = False

DEPS_ASPECTS = [
    module_mappings_aspect,
]

_ADDITIONAL_D_TS = attr.label_list(
    allow_files = True,
)

# Mock out the JsInfo blaze-only provider
JsInfo = provider()

# Attributes shared by any typescript-compatible rule (ts_library, ng_module)
# @unsorted-dict-items
COMMON_ATTRIBUTES = {
    "data": attr.label_list(
        default = [],
        allow_files = True,
    ),
    # A list of diagnostics expected when compiling this library, in the form of
    # "diagnostic:regexp", e.g. "TS1234:failed to quizzle the .* wobble".
    # Useful to test for expected compilation errors.
    "expected_diagnostics": attr.string_list(),
    # Whether to generate externs.js from any "declare" statement.
    "generate_externs": attr.bool(default = True),
    # Used to determine module mappings
    "module_name": attr.string(),
    "module_root": attr.string(),
    # TODO(evanm): make this the default and remove the option.
    "runtime": attr.string(default = "browser"),
    # TODO(radokirov): remove this attr when clutz is stable enough to consume
    # any closure JS code.
    "runtime_deps": attr.label_list(
        default = [],
        providers = [JsInfo],
    ),
    "deps": attr.label_list(
        aspects = DEPS_ASPECTS,
        providers = [DeclarationInfo],
    ),
    "_additional_d_ts": _ADDITIONAL_D_TS,
}

# Attributes shared by any typescript-compatible aspect.
ASPECT_ATTRIBUTES = {
    "_additional_d_ts": _ADDITIONAL_D_TS,
}

COMMON_OUTPUTS = {
    # Allow the tsconfig.json to be generated without running compile actions.
    "tsconfig": "%{name}_tsconfig.json",
}

_DEPSET_TYPE = type(depset())

def _collect_dep_declarations(ctx, declaration_infos):
    """Flattens DeclarationInfo from typescript and javascript dependencies.

    Args:
      ctx: ctx.
      declaration_infos: list of DeclarationInfo collected from dependent targets

    Returns:
      A struct of depsets for direct, transitive and type-blacklisted declarations.
    """

    # .d.ts files from direct dependencies, ok for strict deps
    direct_deps_declarations = [dep.declarations for dep in declaration_infos]

    # all reachable .d.ts files from dependencies.
    transitive_deps_declarations = [dep.transitive_declarations for dep in declaration_infos]

    # all reachable .d.ts files from node_modules attribute (if it has a typescript provider)
    # "node_modules" still checked for backward compat for ng_module
    if hasattr(ctx.attr, "node_modules"):
        if DeclarationInfo in ctx.attr.node_modules:
            transitive_deps_declarations.append(ctx.attr.node_modules[DeclarationInfo].transitive_declarations)
        elif hasattr(ctx.attr.node_modules, "typescript"):
            # TODO(b/139705078): remove this case after bazel BUILD file generation for node_modules is updated
            transitive_deps_declarations.append([ctx.attr.node_modules.typescript.transitive_declarations])
    if hasattr(ctx.attr, "_typescript_typings"):
        transitive_deps_declarations.append(ctx.attr._typescript_typings[DeclarationInfo].transitive_declarations)

    # .d.ts files whose types tsickle will not emit (used for ts_declaration(generate_externs=False).
    type_blocklisted_declarations = [dep.type_blocklisted_declarations for dep in declaration_infos]

    # If a tool like github.com/angular/clutz can create .d.ts from type annotated .js
    # its output will be collected here.

    return DeclarationInfo(
        declarations = depset(transitive = direct_deps_declarations),
        transitive_declarations = depset(ctx.files._additional_d_ts, transitive = transitive_deps_declarations),
        type_blocklisted_declarations = depset(transitive = type_blocklisted_declarations),
    )

def _should_generate_externs(ctx):
    """Whether externs should be generated.

    If ctx has a generate_externs attribute, the value of that is returned.
    Otherwise, this is true."""
    return getattr(ctx.attr, "generate_externs", True)

def _get_runtime(ctx):
    """Gets the runtime for the rule.

    Defaults to "browser" if the runtime attr isn't present."""
    return getattr(ctx.attr, "runtime", "browser")

def _outputs(ctx, label, srcs_files = []):
    """Returns closure js, devmode js, and .d.ts output files.

    Args:
      ctx: ctx.
      label: Label. package label.
      srcs_files: File list. sources files list.

    Returns:
      A struct of file lists for different output types and their relationship to each other.
    """
    workspace_segments = label.workspace_root.split("/") if label.workspace_root else []
    package_segments = label.package.split("/") if label.package else []
    trim = len(workspace_segments) + len(package_segments)
    create_shim_files = False

    closure_js_files = []
    devmode_js_files = []
    declaration_files = []
    transpilation_infos = []
    for input_file in srcs_files:
        is_dts = input_file.short_path.endswith(".d.ts")
        if is_dts and not create_shim_files:
            continue
        basename = "/".join(input_file.short_path.split("/")[trim:])
        for ext in [".d.ts", ".tsx", ".ts"]:
            if basename.endswith(ext):
                basename = basename[:-len(ext)]
                break
        closure_js_file = ctx.actions.declare_file(basename + ".mjs")
        closure_js_files.append(closure_js_file)

        # Temporary until all imports of ngfactory/ngsummary files are removed
        # TODO(alexeagle): clean up after Ivy launch
        if getattr(ctx.attr, "use_angular_plugin", False):
            closure_js_files.append(ctx.actions.declare_file(basename + ".ngfactory.mjs"))
            closure_js_files.append(ctx.actions.declare_file(basename + ".ngsummary.mjs"))

        if not is_dts:
            devmode_js_file = ctx.actions.declare_file(basename + ".js")
            devmode_js_files.append(devmode_js_file)
            transpilation_infos.append(struct(closure = closure_js_file, devmode = devmode_js_file))
            declaration_files.append(ctx.actions.declare_file(basename + ".d.ts"))

            # Temporary until all imports of ngfactory/ngsummary files are removed
            # TODO(alexeagle): clean up after Ivy launch
            if getattr(ctx.attr, "use_angular_plugin", False):
                devmode_js_files.append(ctx.actions.declare_file(basename + ".ngfactory.js"))
                devmode_js_files.append(ctx.actions.declare_file(basename + ".ngsummary.js"))
                declaration_files.append(ctx.actions.declare_file(basename + ".ngfactory.d.ts"))
                declaration_files.append(ctx.actions.declare_file(basename + ".ngsummary.d.ts"))
    return struct(
        closure_js = closure_js_files,
        devmode_js = devmode_js_files,
        declarations = declaration_files,
        transpilation_infos = transpilation_infos,
    )

def compile_ts(
        ctx,
        is_library,
        srcs = None,
        declaration_infos = None,
        compile_action = None,
        devmode_compile_action = None,
        jsx_factory = None,
        tsc_wrapped_tsconfig = None,
        tsconfig = None,
        outputs = _outputs,
        validation_outputs = None):
    """Creates actions to compile TypeScript code.

    This rule is shared between ts_library and ts_declaration.

    Args:
      ctx: ctx.
      is_library: boolean. False if only compiling .dts files.
      srcs: label list. Explicit list of sources to be used instead of ctx.attr.srcs.
      declaration_infos: list of DeclarationInfo. Explicit list of declarations to be used instead of those on ctx.attr.deps.
      compile_action: function. Creates the compilation action.
      devmode_compile_action: function. Creates the compilation action
          for devmode.
      jsx_factory: optional string. Enables overriding jsx pragma.
      tsc_wrapped_tsconfig: function that produces a tsconfig object.
      tsconfig: The tsconfig file to output, if other than ctx.outputs.tsconfig.
      outputs: function from a ctx to the expected compilation outputs.
      validation_outputs: Actions that produce validation outputs will be run whenever any part of
          a rule is run, even if its outputs are not used. This is useful for things like strict deps check.

    Returns:
      struct that will be returned by the rule implementation.
    """

    ### Collect srcs and outputs.
    srcs = srcs if srcs != None else ctx.attr.srcs
    if declaration_infos == None:
        if not hasattr(ctx.attr, "deps"):
            fail("compile_ts must either be called from a rule with a deps attr, or must be given declaration_infos")

        # By default, we collect dependencies from the ctx, when used as a rule
        declaration_infos = [
            d[DeclarationInfo]
            for d in ctx.attr.deps + getattr(ctx.attr, "_helpers", [])
        ]

    tsconfig = tsconfig if tsconfig != None else ctx.outputs.tsconfig
    srcs_files = [f for t in srcs for f in t.files.to_list()]
    src_declarations = []  # d.ts found in inputs.
    tsickle_externs = []  # externs.js generated by tsickle, if any.
    has_sources = False

    for src in srcs:
        if src.label.package != ctx.label.package:
            # Sources can be in sub-folders, but not in sub-packages.
            fail("Sources must be in the same package as the ts_library rule, " +
                 "but %s is not in %s" % (src.label, ctx.label.package), "srcs")
        if hasattr(src, "typescript"):
            # Guard against users accidentally putting deps into srcs by
            # rejecting all srcs values that have a TypeScript provider.
            # TS rules produce a ".d.ts" file, which is a valid input in "srcs",
            # and will then be compiled as a source .d.ts file would, creating
            # externs etc.
            fail(
                "must not reference any TypeScript rules - did you mean deps?",
                "srcs",
            )

        for f in src.files.to_list():
            has_sources = True
            if not is_library and not f.path.endswith(".d.ts"):
                fail("srcs must contain only type declarations (.d.ts files), " +
                     "but %s contains %s" % (src.label, f.short_path), "srcs")
            if f.path.endswith(".d.ts"):
                src_declarations.append(f)
                continue

    outs = outputs(ctx, ctx.label, srcs_files)
    transpiled_closure_js = outs.closure_js
    transpiled_devmode_js = outs.devmode_js
    gen_declarations = outs.declarations

    # Not all existing implementations of outputs() may return transpilation_infos
    transpilation_infos = getattr(outs, "transpilation_infos", [])

    if has_sources and _get_runtime(ctx) != "nodejs":
        # Note: setting this variable controls whether tsickle is run at all.
        tsickle_externs = [ctx.actions.declare_file(ctx.label.name + ".externs.js")]

    dep_declarations = _collect_dep_declarations(ctx, declaration_infos)

    type_blocklisted_declarations = dep_declarations.type_blocklisted_declarations
    if not is_library and not _should_generate_externs(ctx):
        type_blocklisted_declarations = depset(srcs_files, transitive = [type_blocklisted_declarations])

    # The depsets of output files. These are the files that are always built
    # (including e.g. if you "blaze build :the_target" directly).
    files_depsets = []

    # A manifest listing the order of this rule's *.ts files (non-transitive)
    # Only generated if the rule has any sources.
    devmode_manifest = None

    # Enable to produce a performance trace when compiling TypeScript to JS.
    # The trace file location will be printed as a build result and can be read
    # in Chrome's chrome://tracing/ UI.
    perf_trace = _DEBUG
    if "TYPESCRIPT_PERF_TRACE_TARGET" in ctx.var:
        perf_trace = str(ctx.label) == ctx.var["TYPESCRIPT_PERF_TRACE_TARGET"]

    compilation_inputs = dep_declarations.transitive_declarations.to_list() + srcs_files
    tsickle_externs_path = tsickle_externs[0] if tsickle_externs else None

    # Calculate allowed dependencies for strict deps enforcement.
    allowed_deps = depset(
        # A target's sources may depend on each other,
        srcs_files,
        # or on a .d.ts from a direct dependency
        transitive = [dep_declarations.declarations],
    )

    tsconfig_es6 = tsc_wrapped_tsconfig(
        ctx,
        compilation_inputs,
        srcs_files,
        jsx_factory = jsx_factory,
        tsickle_externs = tsickle_externs_path,
        type_blocklisted_declarations = type_blocklisted_declarations.to_list(),
        allowed_deps = allowed_deps,
    )

    # Do not produce declarations in ES6 mode, tsickle cannot produce correct
    # .d.ts (or even errors) from the altered Closure-style JS emit.
    tsconfig_es6["compilerOptions"]["declaration"] = False
    tsconfig_es6["compilerOptions"].pop("declarationDir")
    outputs = transpiled_closure_js + tsickle_externs

    node_profile_args = []
    if perf_trace and has_sources:
        perf_trace_file = ctx.actions.declare_file(ctx.label.name + ".es6.trace")
        tsconfig_es6["bazelOptions"]["perfTracePath"] = perf_trace_file.path
        outputs.append(perf_trace_file)

        profile_file = ctx.actions.declare_file(ctx.label.name + ".es6.v8.log")
        node_profile_args = [
            "--prof",
            # Without nologfile_per_isolate, v8 embeds an
            # unpredictable hash code in the file name, which
            # doesn't work with blaze.
            "--nologfile_per_isolate",
            "--logfile=" + profile_file.path,
        ]
        outputs.append(profile_file)

        files_depsets.append(depset([perf_trace_file, profile_file]))

    ctx.actions.write(
        output = tsconfig,
        content = json_marshal(tsconfig_es6),
    )

    # Parameters of this compiler invocation in case we need to replay this with different
    # settings.
    replay_params = None

    if has_sources:
        inputs = compilation_inputs + [tsconfig] + getattr(ctx.files, "angular_assets", [])
        replay_params = compile_action(
            ctx,
            inputs,
            outputs,
            tsconfig,
            node_profile_args,
        )

        devmode_manifest = ctx.actions.declare_file(ctx.label.name + ".es5.MF")
        tsconfig_json_es5 = ctx.actions.declare_file(ctx.label.name + "_es5_tsconfig.json")
        outputs = (
            transpiled_devmode_js + gen_declarations + [devmode_manifest]
        )
        tsconfig_es5 = tsc_wrapped_tsconfig(
            ctx,
            compilation_inputs,
            srcs_files,
            jsx_factory = jsx_factory,
            devmode_manifest = devmode_manifest.path,
            allowed_deps = allowed_deps,
        )
        node_profile_args = []
        if perf_trace:
            perf_trace_file = ctx.actions.declare_file(ctx.label.name + ".es5.trace")
            tsconfig_es5["bazelOptions"]["perfTracePath"] = perf_trace_file.path
            outputs.append(perf_trace_file)

            profile_file = ctx.actions.declare_file(ctx.label.name + ".es5.v8.log")
            node_profile_args = [
                "--prof",
                # Without nologfile_per_isolate, v8 embeds an
                # unpredictable hash code in the file name, which
                # doesn't work with blaze.
                "--nologfile_per_isolate",
                "--logfile=" + profile_file.path,
            ]
            outputs.append(profile_file)

            files_depsets.append(depset([perf_trace_file, profile_file]))

        ctx.actions.write(output = tsconfig_json_es5, content = json_marshal(
            tsconfig_es5,
        ))
        devmode_compile_action(
            ctx,
            compilation_inputs + [tsconfig_json_es5] + getattr(ctx.files, "angular_assets", []),
            outputs,
            tsconfig_json_es5,
            node_profile_args,
        )

    # TODO(martinprobst): Merge the generated .d.ts files, and enforce strict
    # deps (do not re-export transitive types from the transitive closure).
    transitive_decls = depset(src_declarations + gen_declarations, transitive = [dep_declarations.transitive_declarations])

    # both ts_library and ts_declarations generate .mjs files:
    # - for libraries, this is the ES6/production code
    # - for declarations, these are generated shims
    es6_sources = depset(transpiled_closure_js + tsickle_externs)
    if is_library:
        es5_sources = depset(transpiled_devmode_js)
    else:
        # In development mode, no code ever references shims as they only
        # contain types, and the ES5 code does not get type annotated.
        es5_sources = depset(tsickle_externs)

        # Similarly, in devmode these sources do not get loaded, so do not need
        # to be in a manifest.
        devmode_manifest = None

    # Downstream rules see the .d.ts files produced or declared by this rule.
    declarations_depsets = [depset(gen_declarations + src_declarations)]
    if not srcs_files:
        # Re-export sources from deps.
        # TODO(b/30018387): introduce an "exports" attribute.
        for dep in declaration_infos:
            declarations_depsets.append(dep.declarations)
    files_depsets.extend(declarations_depsets)

    # If this is a ts_declaration, add tsickle_externs to the outputs list to
    # force compilation of d.ts files.  (tsickle externs are produced by running a
    # compilation over the d.ts file and extracting type information.)
    if not is_library:
        files_depsets.append(depset(tsickle_externs))

    transitive_es6_sources_sets = [es6_sources]
    for dep in getattr(ctx.attr, "deps", []):
        if hasattr(dep, "typescript"):
            transitive_es6_sources_sets.append(dep.typescript.transitive_es6_sources)
    transitive_es6_sources = depset(transitive = transitive_es6_sources_sets)

    declarations_provider = DeclarationInfo(
        declarations = depset(transitive = declarations_depsets),
        transitive_declarations = transitive_decls,
        type_blocklisted_declarations = type_blocklisted_declarations,
    )

    # @unsorted-dict-items
    return {
        "providers": [
            DefaultInfo(
                runfiles = ctx.runfiles(
                    # Note: don't include files=... here, or they will *always* be built
                    # by any dependent rule, regardless of whether it needs them.
                    # But these attributes are needed to pass along any input runfiles:
                    collect_default = True,
                    collect_data = True,
                ),
                files = depset(transitive = files_depsets),
            ),
            OutputGroupInfo(
                _validation = depset(validation_outputs if validation_outputs else []),
                es5_sources = es5_sources,
                es6_sources = es6_sources,
            ),
            declarations_provider,
        ],
        # Also expose the DeclarationInfo as a named provider so that aspect implementations can reference it
        # Otherwise they would be forced to reference it by a numeric index out of the "providers" list above.
        "declarations": declarations_provider,
        "instrumented_files": {
            "dependency_attributes": ["deps", "runtime_deps"],
            "extensions": ["ts", "tsx"],
            "source_attributes": ["srcs"],
        },
        # Expose the module_name so that packaging rules can access it.
        # e.g. rollup_bundle under Bazel needs to convert this into a UMD global
        # name in the Rollup configuration.
        "module_name": getattr(ctx.attr, "module_name", None),
        # Expose the tags so that a Bazel aspect can access them.
        "tags": ctx.attr.tags if hasattr(ctx.attr, "tags") else ctx.rule.attr.tags,
        # @unsorted-dict-items
        "typescript": {
            "devmode_manifest": devmode_manifest,
            "es5_sources": es5_sources,
            "es6_sources": es6_sources,
            "replay_params": replay_params,
            "transitive_es6_sources": transitive_es6_sources,
            "tsickle_externs": tsickle_externs,
            "transpilation_infos": transpilation_infos,
        },
    }

def ts_providers_dict_to_struct(d):
    """ Converts a dict to a struct, recursing into a single level of nested dicts.

    This allows users of compile_ts to modify or augment the returned dict before
    converting it to an immutable struct.

    Args:
        d: the dict to convert

    Returns:
        An immutable struct created from the input dict
    """

    # These keys are present in the dict so that aspects can reference them,
    # however they should not be output as legacy providers since we have modern
    # symbol-typed providers for them.
    js_provider = d.pop("js", None)
    declarations_provider = d.pop("declarations", None)

    # Promote the "js" string-typed provider to a modern provider
    if js_provider:
        # Create a new providers list rather than modify the existing list
        d["providers"] = d.get("providers", []) + [js_provider]

    for key, value in d.items():
        if key != "output_groups" and type(value) == type({}):
            d[key] = struct(**value)
    result = struct(**d)

    # Restore the elements we removed, to avoid side-effect of mutating the argument
    if js_provider:
        d["js"] = js_provider
    if declarations_provider:
        d["declarations"] = declarations_provider
    return result
