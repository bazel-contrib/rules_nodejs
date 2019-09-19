"A generic rule to run a tool that appears in node_modules/.bin"

load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "register_node_modules_linker")

# Note: this API is chosen to match nodejs_binary
# so that we can generate macros that act as either an output-producing tool or an executable
_ATTRS = {
    "outs": attr.output_list(),
    "args": attr.string_list(mandatory = True),
    "data": attr.label_list(allow_files = True, aspects = [module_mappings_aspect]),
    "tool": attr.label(
        executable = True,
        cfg = "host",
        mandatory = True,
    ),
}

def _impl(ctx):
    args = ctx.actions.args()
    inputs = ctx.files.data[:]
    outputs = ctx.outputs.outs
    register_node_modules_linker(ctx, args, inputs)
    for a in ctx.attr.args:
        args.add(ctx.expand_location(a, targets = ctx.attr.data))
    ctx.actions.run(
        executable = ctx.executable.tool,
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
    )

_npm_package_bin = rule(
    _impl,
    attrs = _ATTRS,
)

def npm_package_bin(tool = None, package = None, package_bin = None, **kwargs):
    """Run an arbitrary npm package binary (anything under node_modules/.bin/*) under Bazel.
    It must produce outputs. If you just want to run a program with `bazel run`, use the nodejs_binary rule.

    This is like a genrule() except that it runs our launcher script that first
    links the node_modules tree before running the program.

    This is a great candidate to wrap with a macro, as documented:
    https://docs.bazel.build/versions/master/skylark/macros.html#full-example

    Args:
        data: identical to [genrule.srcs](https://docs.bazel.build/versions/master/be/general.html#genrule.srcs)
              may also include targets that produce or reference npm packages which are needed by the tool
        outs: identical to [genrule.outs](https://docs.bazel.build/versions/master/be/general.html#genrule.outs)
        args: Command-line arguments to the tool.

            Subject to 'Make variable' substitution.
            Can use $(location) expansion. See https://docs.bazel.build/versions/master/be/make-variables.html

        package: an npm package whose binary to run, like "terser". Assumes your node_modules are installed in a workspace called "npm"
        package_bin: the "bin" entry from `package` that should be run. By default package_bin is the same string as `package`
        tool: a label for a binary to run, like `@npm//terser/bin:terser`. This is the longer form of package/package_bin
    """
    if not tool:
        if not package:
            fail("You must supply either the tool or package attribute")
        if not package_bin:
            package_bin = package
        tool = "@npm//%s/bin:%s" % (package, package_bin)
    _npm_package_bin(
        tool = tool,
        **kwargs
    )
