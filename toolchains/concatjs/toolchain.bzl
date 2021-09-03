"""Toolchain and helper definitions for concatjs"""

def _concatjs_toolchain_impl(ctx):
    return [
        platform_common.ToolchainInfo(
            binary = ctx.executable.binary,
        ),
        platform_common.TemplateVariableInfo({
            "DEVSERVER_PATH": ctx.executable.binary.path,
        }),
    ]

_concatjs_toolchain = rule(
    implementation = _concatjs_toolchain_impl,
    attrs = {
        "binary": attr.label(
            allow_single_file = True,
            executable = True,
            cfg = "exec",
        ),
    },
)

TOOLCHAIN = Label("@build_bazel_rules_nodejs//toolchains/concatjs:toolchain_type")

def configure_concatjs_toolchain(name, binary, exec_compatible_with):
    """Defines a toolchain for concatjs given the binary path and platform constraints

    Args:
        name: unique name for this toolchain, generally in the form "concatjs_platform_arch"
        binary: label for the concatjs binary
        exec_compatible_with: list of platform constraints
    """

    _concatjs_toolchain(
        name = name,
        binary = binary,
    )

    native.toolchain(
        name = "%s_toolchain" % name,
        exec_compatible_with = exec_compatible_with,
        toolchain = name,
        toolchain_type = TOOLCHAIN,
    )

def configure_concatjs_toolchains(name = "", platforms = {}):
    """Configures concatjs toolchains for a list of supported platforms

    Args:
        name: unused
        platforms: dict of platforms to configure toolchains for
    """

    for name, meta in platforms.items():
        repo = "concatjs_%s" % name
        configure_concatjs_toolchain(
            name = repo,
            binary = "@%s//:file" % (repo, meta.binary_path),
            exec_compatible_with = meta.exec_compatible_with,
        )
