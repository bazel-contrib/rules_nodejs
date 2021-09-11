"""Provide rules access to the config of the current build

Modelled after _GoContextData in rules_go/go/private/context.bzl
"""

NodeContextInfo = provider(
    doc = "Provides data about the build context, like config_setting's",
    fields = {
        "stamp": "If stamping is enabled for this build",
    },
)

NODE_CONTEXT_ATTRS = {
    "node_context_data": attr.label(
        default = "@build_bazel_rules_nodejs//internal:node_context_data",
        providers = [NodeContextInfo],
        doc = """Provides info about the build context, such as stamping.
        
By default it reads from the bazel command line, such as the `--stamp` argument.
Use this to override values for this target, such as enabling or disabling stamping.
You can use the `node_context_data` rule in `@build_bazel_rules_nodejs//internal/node:context.bzl`
to create a NodeContextInfo.
""",
    ),
}
