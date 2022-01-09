"ts_project rule"

load("@build_bazel_rules_nodejs//:providers.bzl", "run_node")
load(":ts_config.bzl", "lib")

ValidOptionsInfo = provider()

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

    inputs = lib.tsconfig_inputs(ctx)

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

validate_options = rule(
    implementation = _validate_options_impl,
    attrs = {
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
        "target": attr.string(),
        "ts_build_info_file": attr.string(),
        "tsconfig": attr.label(mandatory = True, allow_single_file = [".json"]),
        "validator": attr.label(default = Label("//packages/typescript/bin:ts_project_options_validator"), executable = True, cfg = "host"),
    },
)
