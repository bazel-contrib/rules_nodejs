"extensions for bzlmod"

load(":repositories.bzl", "DEFAULT_NODE_REPOSITORY", "DEFAULT_NODE_VERSION", "nodejs_register_toolchains")

def _toolchain_extension(module_ctx):
    registrations = {}
    for mod in module_ctx.modules:
        for toolchain in mod.tags.toolchain:
            if toolchain.name != DEFAULT_NODE_REPOSITORY and not mod.is_root:
                fail("Only the root module may provide a name for the node toolchain.")

            if toolchain.name in registrations.keys():
                if toolchain.name == DEFAULT_NODE_REPOSITORY:
                    # Prioritize the root-most registration of the default node toolchain version and
                    # ignore any further registrations (modules are processed breadth-first)
                    continue
                if toolchain.node_version == registrations[toolchain.name].node_version and toolchain.node_version_from_nvmrc == registrations[toolchain.name].node_version_from_nvmrc:
                    # No problem to register a matching toolchain twice
                    continue
                fail("Multiple conflicting toolchains declared for name {} ({} and {})".format(
                    toolchain.name,
                    toolchain.node_version,
                    registrations[toolchain.name],
                ))
            else:
                registrations[toolchain.name] = struct(
                    node_version = toolchain.node_version,
                    node_version_from_nvmrc = toolchain.node_version_from_nvmrc,
                    include_headers = toolchain.include_headers,
                )

    for k, v in registrations.items():
        nodejs_register_toolchains(
            name = k,
            node_version = v.node_version,
            node_version_from_nvmrc = v.node_version_from_nvmrc,
            include_headers = v.include_headers,
            register = False,
        )

node = module_extension(
    implementation = _toolchain_extension,
    tag_classes = {
        "toolchain": tag_class(attrs = {
            "name": attr.string(
                doc = "Base name for generated repositories",
                default = DEFAULT_NODE_REPOSITORY,
            ),
            "node_version": attr.string(
                doc = "Version of the Node.js interpreter",
                default = DEFAULT_NODE_VERSION,
            ),
            "node_version_from_nvmrc": attr.label(
                allow_single_file = True,
                doc = """The .nvmrc file containing the version of Node.js to use.

If set then the version found in the .nvmrc file is used instead of the one specified by node_version.""",
            ),
            "include_headers": attr.bool(
                doc = """Set headers field in NodeInfo provided by this toolchain.

This setting creates a dependency on a c++ toolchain.
""",
            ),
        }),
    },
)
