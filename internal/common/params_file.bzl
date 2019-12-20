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

"""Generates a params file from a list of arguments.
"""

load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")

_DOC = """Generates a params file from a list of arguments."""

_ATTRS = {
    "out": attr.output(
        doc = """Path of the output file, relative to this package.""",
        mandatory = True,
    ),
    "args": attr.string_list(
        doc = """Arguments to concatenate into a params file.
Subject to $(location) substitutions""",
    ),
    "data": attr.label_list(
        doc = """Data for $(location) expansions in args.""",
        allow_files = True,
    ),
    "is_windows": attr.bool(mandatory = True),
    "newline": attr.string(
        doc = """one of ["auto", "unix", "windows"]: line endings to use. "auto"
for platform-determined, "unix" for LF, and "windows" for CRLF.""",
        values = ["unix", "windows", "auto"],
        default = "auto",
    ),
}

def _impl(ctx):
    if ctx.attr.newline == "auto":
        newline = "\r\n" if ctx.attr.is_windows else "\n"
    elif ctx.attr.newline == "windows":
        newline = "\r\n"
    else:
        newline = "\n"

    # ctx.actions.write creates a FileWriteAction which uses UTF-8 encoding.
    ctx.actions.write(
        output = ctx.outputs.out,
        content = newline.join([expand_location_into_runfiles(ctx, a, ctx.attr.data) for a in ctx.attr.args]),
        is_executable = False,
    )
    files = depset(direct = [ctx.outputs.out])
    runfiles = ctx.runfiles(files = [ctx.outputs.out])
    return [DefaultInfo(files = files, runfiles = runfiles)]

_params_file = rule(
    implementation = _impl,
    provides = [DefaultInfo],
    attrs = _ATTRS,
    doc = _DOC,
)

def params_file(
        name,
        out,
        args = [],
        newline = "auto",
        **kwargs):
    """Generates a UTF-8 encoded params file from a list of arguments.

    Handles $(location) expansions for arguments.

    Args:
      name: Name of the rule.
      out: Path of the output file, relative to this package.
      args: Arguments to concatenate into a params file.
          Subject to $(location) substitutions
      newline: one of ["auto", "unix", "windows"]: line endings to use. "auto"
          for platform-determined, "unix" for LF, and "windows" for CRLF.
      **kwargs: further keyword arguments, e.g. <code>visibility</code>
    """
    _params_file(
        name = name,
        out = out,
        args = args,
        newline = newline or "auto",
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )
