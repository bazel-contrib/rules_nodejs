"Minimal fixture for executing the linker's starlark code"

load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "write_node_modules_manifest")

def _linked(ctx):
    modules_manifest = write_node_modules_manifest(ctx)
    ctx.actions.run(
        inputs = ctx.files.deps + [modules_manifest],
        outputs = [ctx.outputs.out],
        executable = ctx.executable.program,
        arguments = [
            "--bazel_node_modules_manifest=%s" % modules_manifest.path,
            ctx.outputs.out.path,
        ],
    )

linked = rule(_linked, attrs = {
    "deps": attr.label_list(
        allow_files = True,
        aspects = [module_mappings_aspect],
    ),
    "out": attr.output(),
    "program": attr.label(executable = True, cfg = "host", mandatory = True),
})
