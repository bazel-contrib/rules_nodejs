"Experimental prototype of new nodejs_binary and nodejs_test"

load("@rules_nodejs//nodejs:providers.bzl", "LinkablePackageInfo")
load("@rules_nodejs//nodejs/private:runfiles_utils.bzl", "BASH_RLOCATION_FUNCTION", "BATCH_RLOCATION_FUNCTION", "to_manifest_path")

def _strip_external(path):
    return path[len("external/"):] if path.startswith("external/") else path

def _windows_launcher(ctx, linkable):
    node_bin = ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo
    launcher = ctx.actions.declare_file("_%s_launcher.bat" % ctx.label.name)

    if len(linkable):
        p = linkable[0][LinkablePackageInfo].package_name
        dots = "/".join([".."] * len(p.split("/")))
        node_path = "call :rlocation \"node_modules/{0}\" node_path\nset NODE_PATH=!node_path!/{1}".format(p, dots)
    else:
        node_path = ""

    ctx.actions.write(
        output = launcher,
        content = r"""@echo off
SETLOCAL ENABLEEXTENSIONS
SETLOCAL ENABLEDELAYEDEXPANSION
set RUNFILES_MANIFEST_ONLY=1
{rlocation_function}
call :rlocation "{node}" node
call :rlocation "{entry_point}" entry_point

for %%a in ("!node!") do set "node_dir=%%~dpa"
set PATH=%node_dir%;%PATH%
{node_path}
set args=%*
rem Escape \ and * in args before passsing it with double quote
if defined args (
  set args=!args:\=\\\\!
  set args=!args:"=\"!
)
"!node!" "!entry_point!" "!args!"
""".format(
            node = _strip_external(node_bin.target_tool_path),
            rlocation_function = BATCH_RLOCATION_FUNCTION,
            entry_point = to_manifest_path(ctx, ctx.file.entry_point),
            # FIXME: wire in the args to the batch script
            args = " ".join(ctx.attr.args),
            node_path = node_path,
        ),
        is_executable = True,
    )
    return launcher

def _bash_launcher(ctx, linkable):
    bash_bin = ctx.toolchains["@bazel_tools//tools/sh:toolchain_type"].path
    node_bin = ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo
    launcher = ctx.actions.declare_file("_%s_launcher.sh" % ctx.label.name)

    if len(linkable):
        pkgs = [link[LinkablePackageInfo].package_name for link in linkable]
        paths = [
            "$(rlocation node_modules/{0})/{1}".format(
                p,
                "/".join([".."] * len(p.split("/"))),
            )
            for p in pkgs
        ]
        node_path = "export NODE_PATH=" + ":".join(paths)
    else:
        node_path = ""
    ctx.actions.write(
        launcher,
        """#!{bash}
{rlocation_function}
set -o pipefail -o errexit -o nounset
{node_path}
$(rlocation {node}) \\
$(rlocation {entry_point}) \\
{args} $@
""".format(
            bash = bash_bin,
            rlocation_function = BASH_RLOCATION_FUNCTION,
            node = _strip_external(node_bin.target_tool_path),
            entry_point = to_manifest_path(ctx, ctx.file.entry_point),
            args = " ".join(ctx.attr.args),
            node_path = node_path,
        ),
        is_executable = True,
    )
    return launcher

def _nodejs_binary_impl(ctx):
    linkable = [
        d
        for d in ctx.attr.data
        if LinkablePackageInfo in d and
           len(d[LinkablePackageInfo].files) == 1 and
           d[LinkablePackageInfo].files[0].is_directory
    ]

    # We use the root_symlinks feature of runfiles to make a node_modules directory
    # containing all our modules, but you need to have --enable_runfiles for that to
    # exist on the disk. If it doesn't we can probably do something else, like a very
    # long NODE_PATH composed of all the locations of the packages, or adapt the linker
    # to still fill in the runfiles case.
    # For now we just require it if there's more than one package to resolve
    if len(linkable) > 1 and not ctx.attr.enable_runfiles:
        fail("need --enable_runfiles for multiple node_modules to be resolved")

    launcher = _windows_launcher(ctx, linkable) if ctx.attr.is_windows else _bash_launcher(ctx, linkable)
    all_files = ctx.files.data + ctx.files._runfiles_lib + [ctx.file.entry_point] + ctx.toolchains["@rules_nodejs//nodejs:toolchain_type"].nodeinfo.tool_files
    runfiles = ctx.runfiles(
        files = all_files,
        transitive_files = depset(all_files),
    )
    for dep in ctx.attr.data:
        runfiles = runfiles.merge(dep[DefaultInfo].default_runfiles)
    return DefaultInfo(
        executable = launcher,
        runfiles = runfiles,
    )

# Expose our library as a struct so that nodejs_binary and nodejs_test can both extend it
nodejs_binary = struct(
    attrs = {
        "data": attr.label_list(allow_files = True),
        "entry_point": attr.label(allow_single_file = True),
        "is_windows": attr.bool(mandatory = True),
        "enable_runfiles": attr.bool(mandatory = True),
        "_runfiles_lib": attr.label(default = "@bazel_tools//tools/bash/runfiles"),
    },
    nodejs_binary_impl = _nodejs_binary_impl,
    toolchains = [
        # TODO: only need bash on non-windows
        "@bazel_tools//tools/sh:toolchain_type",
        "@rules_nodejs//nodejs:toolchain_type",
    ],
)
