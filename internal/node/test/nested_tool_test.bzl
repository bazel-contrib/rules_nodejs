""""""
_TEST_TEMPLATE = """#!/bin/bash
# Unset TEST_SRCDIR since we're trying to test the non-test behavior
unset TEST_SRCDIR

# --- begin runfiles.bash initialization v2 ---
# Copy-pasted from the Bazel Bash runfiles library v2.
set -uo pipefail; f=bazel_tools/tools/bash/runfiles/runfiles.bash
source "${RUNFILES_DIR:-/dev/null}/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "${RUNFILES_MANIFEST_FILE:-/dev/null}" | cut -f2- -d' ')" 2>/dev/null || \
  source "$0.runfiles/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.exe.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  { echo>&2 "ERROR: cannot find $f"; exit 1; }; f=; set -e
# --- end runfiles.bash initialization v2 ---
runfiles_export_envvars
$(rlocation {nested_tool})
"""

def _runfiles_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _impl(ctx):
    runfiles = ctx.runfiles()
    runfiles = runfiles.merge(ctx.attr._bash_runfiles.default_runfiles)
    runfiles = runfiles.merge(ctx.attr.nested_tool.default_runfiles)

    script = ctx.actions.declare_file(ctx.label.name)

    ctx.actions.write(
        script,
        _TEST_TEMPLATE.replace("{nested_tool}", _runfiles_path(ctx, ctx.executable.nested_tool)),
        is_executable = True
    )

    return [
        DefaultInfo(
            executable = script,
            runfiles = runfiles,
        ),
    ]

nested_tool_test = rule(
    implementation = _impl,
    test = True,
    # executable = True,
    attrs = {
        "nested_tool": attr.label(
            executable = True,
            mandatory = True,
            cfg = "target",
        ),
        "_bash_runfiles": attr.label(
            allow_files = True,
            default = Label("@bazel_tools//tools/bash/runfiles"),
        ),
    },
)
