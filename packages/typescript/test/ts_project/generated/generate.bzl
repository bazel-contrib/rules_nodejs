  
_TEMPLATE = "//packages/typescript/test/ts_project/generated:default.tsconfig.json"

def _templater_impl(ctx):
    ctx.actions.expand_template(
        template = ctx.file._template,
        output = ctx.outputs.tsconfig,
        substitutions = {
            # this should be the relative path between "ctx.file.base" and "ctx.outputs.tsconfig"
            "{EXTENDS}": ctx.file.base.short_path,
        },
    )

generate_tsconfig = rule(
    implementation = _templater_impl,
    attrs = {
        "base": attr.label(mandatory = True, allow_single_file = True),
        "_template": attr.label(
            default = Label(_TEMPLATE),
            allow_single_file = True,
        ),
    },
    outputs = {"tsconfig": "%{name}.tsconfig.json"},
)