# Copyright 2019 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Implementation of copy_file macro and underlying rules.

These rules copy a file to another location using Bash (on Linux/macOS) or
cmd.exe (on Windows). '_copy_xfile' marks the resulting file executable,
'_copy_file' does not.
"""

def copy_cmd(ctx, src, dst):
    # Most Windows binaries built with MSVC use a certain argument quoting
    # scheme. Bazel uses that scheme too to quote arguments. However,
    # cmd.exe uses different semantics, so Bazel's quoting is wrong here.
    # To fix that we write the command to a .bat file so no command line
    # quoting or escaping is required.
    bat = ctx.actions.declare_file(ctx.label.name + "-cmd.bat")
    ctx.actions.write(
        output = bat,
        # Do not use lib/shell.bzl's shell.quote() method, because that uses
        # Bash quoting syntax, which is different from cmd.exe's syntax.
        content = "@copy /Y \"%s\" \"%s\" >NUL" % (
            src.path.replace("/", "\\"),
            dst.path.replace("/", "\\"),
        ),
        is_executable = True,
    )
    ctx.actions.run(
        inputs = [src],
        tools = [bat],
        outputs = [dst],
        executable = "cmd.exe",
        arguments = ["/C", bat.path.replace("/", "\\")],
        mnemonic = "CopyFile",
        progress_message = "Copying files",
        use_default_shell_env = True,
    )

def copy_bash(ctx, src, dst):
    ctx.actions.run_shell(
        tools = [src],
        outputs = [dst],
        command = "cp -f \"$1\" \"$2\"",
        arguments = [src.path, dst.path],
        mnemonic = "CopyFile",
        progress_message = "Copying files",
        use_default_shell_env = True,
    )

def _common_impl(ctx, is_executable):
    if ctx.attr.is_windows:
        copy_cmd(ctx, ctx.file.src, ctx.outputs.out)
    else:
        copy_bash(ctx, ctx.file.src, ctx.outputs.out)

    files = depset(direct = [ctx.outputs.out])
    runfiles = ctx.runfiles(files = [ctx.outputs.out])
    if is_executable:
        return [DefaultInfo(files = files, runfiles = runfiles, executable = ctx.outputs.out)]
    else:
        return [DefaultInfo(files = files, runfiles = runfiles)]

def _impl(ctx):
    return _common_impl(ctx, False)

def _ximpl(ctx):
    return _common_impl(ctx, True)

_ATTRS = {
    "src": attr.label(mandatory = True, allow_single_file = True),
    "out": attr.output(mandatory = True),
    "is_windows": attr.bool(mandatory = True),
}

_copy_file = rule(
    implementation = _impl,
    provides = [DefaultInfo],
    attrs = _ATTRS,
)

_copy_xfile = rule(
    implementation = _ximpl,
    executable = True,
    provides = [DefaultInfo],
    attrs = _ATTRS,
)

def copy_file(name, src, out, is_executable = False, **kwargs):
    """Copies a file to another location.

    `native.genrule()` is sometimes used to copy files (often wishing to rename them). The 'copy_file' rule does this with a simpler interface than genrule.

    This rule uses a Bash command on Linux/macOS/non-Windows, and a cmd.exe command on Windows (no Bash is required).

    Args:
      name: Name of the rule.
      src: A Label. The file to make a copy of. (Can also be the label of a rule
          that generates a file.)
      out: Path of the output file, relative to this package.
      is_executable: A boolean. Whether to make the output file executable. When
          True, the rule's output can be executed using `bazel run` and can be
          in the srcs of binary and test rules that require executable sources.
      **kwargs: further keyword arguments, e.g. `visibility`
    """
    if is_executable:
        _copy_xfile(
            name = name,
            src = src,
            out = out,
            is_windows = select({
                "@bazel_tools//src/conditions:host_windows": True,
                "//conditions:default": False,
            }),
            **kwargs
        )
    else:
        _copy_file(
            name = name,
            src = src,
            out = out,
            is_windows = select({
                "@bazel_tools//src/conditions:host_windows": True,
                "//conditions:default": False,
            }),
            **kwargs
        )
