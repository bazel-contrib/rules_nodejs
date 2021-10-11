"Experimental prototype of new nodejs_binary and nodejs_test"

load("@rules_nodejs//nodejs/private:runfiles_utils.bzl", "BASH_RLOCATION_FUNCTION", "BATCH_RLOCATION_FUNCTION", "to_manifest_path")

def _strip_external(path):
    return path[len("external/"):] if path.startswith("external/") else path

def _windows_launcher(ctx):
    node_bin = ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo
    launcher = ctx.actions.declare_file("_%s_launcher.bat" % ctx.label.name)
    ctx.actions.write(
        output = launcher,
        content = r"""@echo off
SETLOCAL ENABLEEXTENSIONS
SETLOCAL ENABLEDELAYEDEXPANSION
set RUNFILES_MANIFEST_ONLY=1
{rlocation_function}
call :rlocation "{entry_point}" entry_point
call :rlocation "node_modules/acorn" nma
for %%a in ("{node}") do set "node_dir=%%~dpa"
set PATH=%node_dir%;%PATH%
set NODE_PATH=!nma!\..
set args=%*
rem Escape \ and * in args before passsing it with double quote
if defined args (
  set args=!args:\=\\\\!
  set args=!args:"=\"!
)
"{node}" "!entry_point!" "!args!"
""".format(
            node = node_bin.target_tool_path,
            rlocation_function = BATCH_RLOCATION_FUNCTION,
            entry_point = to_manifest_path(ctx, ctx.file.entry_point),
            # FIXME: wire in the args to the batch script
            args = " ".join(ctx.attr.args),
        ),
        is_executable = True,
    )
    return launcher

def _bash_launcher(ctx):
    bash_bin = ctx.toolchains["@bazel_tools//tools/sh:toolchain_type"].path
    node_bin = ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo
    launcher = ctx.actions.declare_file("_%s_launcher.sh" % ctx.label.name)
    ctx.actions.write(
        launcher,
        """#!{bash}
{rlocation_function}
set -o pipefail -o errexit -o nounset
NODE_PATH=$(rlocation node_modules/acorn)/.. \\
$(rlocation {node}) \\
$(rlocation {entry_point}) \\
{args} $@
""".format(
            bash = bash_bin,
            rlocation_function = BASH_RLOCATION_FUNCTION,
            node = _strip_external(node_bin.target_tool_path),
            entry_point = to_manifest_path(ctx, ctx.file.entry_point),
            args = " ".join(ctx.attr.args),
        ),
        is_executable = True,
    )
    return launcher

def _nodejs_binary_impl(ctx):
    launcher = _windows_launcher(ctx) if ctx.attr.is_windows else _bash_launcher(ctx)
    all_files = ctx.files.data + ctx.files._runfiles_lib + [ctx.file.entry_point] + ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo.tool_files
    runfiles = ctx.runfiles(
        files = all_files,
        transitive_files = depset(all_files),
        root_symlinks = {
            "node_modules/acorn": d
            for d in ctx.files.data
        },
    )
    return DefaultInfo(
        executable = launcher,
        runfiles = runfiles,
    )

_ATTRS = {
    "data": attr.label_list(allow_files = True),
    "entry_point": attr.label(allow_single_file = True),
    "is_windows": attr.bool(mandatory = True),
    "_runfiles_lib": attr.label(default = "@bazel_tools//tools/bash/runfiles"),
}

_nodejs_binary = rule(
    implementation = _nodejs_binary_impl,
    attrs = _ATTRS,
    executable = True,
    toolchains = [
        # TODO: only need bash on non-windows
        "@bazel_tools//tools/sh:toolchain_type",
        "@rules_nodejs//nodejs:toolchain_type",
    ],
)

_nodejs_test = rule(
    implementation = _nodejs_binary_impl,
    attrs = _ATTRS,
    test = True,
    toolchains = [
        # TODO: only need bash on non-windows
        "@bazel_tools//tools/sh:toolchain_type",
        "@rules_nodejs//nodejs:toolchain_type",
    ],
)

def nodejs_binary(**kwargs):
    _nodejs_binary(
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )

def nodejs_test(**kwargs):
    _nodejs_test(
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )
