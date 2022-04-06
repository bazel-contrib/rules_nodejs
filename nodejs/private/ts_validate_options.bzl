"Helper rule to check that ts_project attributes match tsconfig.json properties"

load(":ts_config.bzl", "TsConfigInfo")
load(":ts_lib.bzl", "COMPILER_OPTION_ATTRS")

ValidOptionsInfo = provider(
    doc = "Internal: whether the validator ran successfully",
    fields = {
        "marker": """useless file that must be depended on to cause the validation action to run.
        TODO: replace with https://docs.bazel.build/versions/main/skylark/rules.html#validation-actions""",
    },
)

def _tsconfig_inputs(ctx):
    """Returns all transitively referenced tsconfig files from "tsconfig" and "extends" attributes."""
    inputs = []
    if TsConfigInfo in ctx.attr.tsconfig:
        inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)
    else:
        inputs.append(ctx.file.tsconfig)
    if hasattr(ctx.attr, "extends") and ctx.attr.extends:
        if TsConfigInfo in ctx.attr.extends:
            inputs.extend(ctx.attr.extends[TsConfigInfo].deps)
        else:
            inputs.extend(ctx.attr.extends.files.to_list())
    return inputs

def _validate_options_impl(ctx, run_action):
    # Bazel won't run our action unless its output is needed, so make a marker file
    # We make it a .d.ts file so we can plumb it to the deps of the ts_project compile.
    marker = ctx.actions.declare_file("%s.optionsvalid.d.ts" % ctx.label.name)

    arguments = ctx.actions.args()
    config = struct(
        allow_js = ctx.attr.allow_js,
        declaration = ctx.attr.declaration,
        declaration_map = ctx.attr.declaration_map,
        has_local_deps = ctx.attr.has_local_deps,
        preserve_jsx = ctx.attr.preserve_jsx,
        composite = ctx.attr.composite,
        emit_declaration_only = ctx.attr.emit_declaration_only,
        resolve_json_module = ctx.attr.resolve_json_module,
        source_map = ctx.attr.source_map,
        incremental = ctx.attr.incremental,
        ts_build_info_file = ctx.attr.ts_build_info_file,
    )
    arguments.add_all([ctx.file.tsconfig.path, marker.path, ctx.attr.target, json.encode(config)])

    inputs = _tsconfig_inputs(ctx)

    run_action(
        ctx,
        inputs = inputs,
        outputs = [marker],
        arguments = [arguments],
        executable = "validator",
        env = {
            "BINDIR": ctx.var["BINDIR"],
        },
    )
    return [
        ValidOptionsInfo(marker = marker),
    ]

_ATTRS = dict(COMPILER_OPTION_ATTRS, **{
    "has_local_deps": attr.bool(doc = "Whether any of the deps are in the local workspace"),
    "target": attr.string(),
    "ts_build_info_file": attr.string(),
    "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
    "validator": attr.label(mandatory = True, executable = True, cfg = "exec"),
})

lib = struct(
    attrs = _ATTRS,
    implementation = _validate_options_impl,
    tsconfig_inputs = _tsconfig_inputs,
)
