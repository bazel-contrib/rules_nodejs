"Simplest possible rule for testing it can be loaded and called"

_ATTRS = {
    # Note, we can reference our file without needing "@npm" which means it works
    # regardless what name the user chooses for their workspace
    "text": attr.label(default = Label("//bazel_workspaces_consistent:a.txt"), allow_single_file = True),
}

def _impl(ctx):
    # No actions, just echo the input file as the default output
    return [DefaultInfo(files = depset(ctx.files.text))]

some_rule = rule(_impl, attrs = _ATTRS)
