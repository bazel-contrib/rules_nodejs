"Helper rule to check that ts_project attributes match tsconfig.json properties"

load("@build_bazel_rules_nodejs//:providers.bzl", "run_node")
load(":ts_config.bzl", "TsConfigInfo")

ValidOptionsInfo = provider()

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

def _validate_options_impl(ctx):
    # Bazel won't run our action unless its output is needed, so make a marker file
    # We make it a .d.ts file so we can plumb it to the deps of the ts_project compile.
    marker = ctx.actions.declare_file("%s.optionsvalid.d.ts" % ctx.label.name)

    arguments = ctx.actions.args()
    config = struct(
        allow_js = ctx.attr.allow_js,
        declaration = ctx.attr.declaration,
        declaration_map = ctx.attr.declaration_map,
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

    run_node(
        ctx,
        inputs = inputs,
        outputs = [marker],
        arguments = [arguments],
        executable = "validator",
    )
    return [
        ValidOptionsInfo(marker = marker),
    ]

# These attrs are shared between the validate and the ts_project rules
SHARED_ATTRS = {
    "allow_js": attr.bool(),
    "composite": attr.bool(),
    "declaration": attr.bool(),
    "declaration_map": attr.bool(),
    "emit_declaration_only": attr.bool(),
    "extends": attr.label(allow_files = [".json"]),
    "incremental": attr.bool(),
    "preserve_jsx": attr.bool(),
    "resolve_json_module": attr.bool(),
    "source_map": attr.bool(),
}

validate_options = rule(
    implementation = _validate_options_impl,
    attrs = dict(SHARED_ATTRS, **{
        "target": attr.string(),
        "ts_build_info_file": attr.string(),
        "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
        "validator": attr.label(default = Label("//packages/typescript/bin:ts_project_options_validator"), executable = True, cfg = "exec"),
    }),
)

lib = struct(
    tsconfig_inputs = _tsconfig_inputs,
    attrs = SHARED_ATTRS,
)
