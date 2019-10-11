"A generic rule to run a tool that appears in node_modules/.bin"

load("@build_bazel_rules_nodejs//:providers.bzl", "NpmPackageInfo", "node_modules_aspect")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "register_node_modules_linker")

# Note: this API is chosen to match nodejs_binary
# so that we can generate macros that act as either an output-producing tool or an executable
_ATTRS = {
    "outs": attr.output_list(),
    "args": attr.string_list(mandatory = True),
    "data": attr.label_list(allow_files = True, aspects = [module_mappings_aspect, node_modules_aspect]),
    "output_dir": attr.bool(),
    "tool": attr.label(
        executable = True,
        cfg = "host",
        mandatory = True,
    ),
}

# Need a custom expand_location function
# because the output_dir is a tree artifact
# so we weren't able to give it a label
def _expand_location(ctx, s):
    outdir_segments = [ctx.bin_dir.path, ctx.label.package]
    if ctx.attr.output_dir:
        # We'll write into a newly created directory named after the rule
        outdir_segments.append(ctx.attr.name)

    # The list comprehension removes empty segments like if we are in the root package
    s = s.replace("$@", "/".join([o for o in outdir_segments if o]))
    return ctx.expand_location(s, targets = ctx.attr.data)

def _inputs(ctx):
    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the NpmPackageInfo provider.
    inputs_depsets = []
    for d in ctx.attr.data:
        if NpmPackageInfo in d:
            inputs_depsets.append(d[NpmPackageInfo].sources)
    return depset(ctx.files.data, transitive = inputs_depsets).to_list()

def _impl(ctx):
    if ctx.attr.output_dir and ctx.attr.outs:
        fail("Only one of output_dir and outs may be specified")
    if not ctx.attr.output_dir and not ctx.attr.outs:
        fail("One of output_dir and outs must be specified")

    args = ctx.actions.args()
    inputs = _inputs(ctx)
    outputs = []
    if ctx.attr.output_dir:
        outputs = [ctx.actions.declare_directory(ctx.attr.name)]
    else:
        outputs = ctx.outputs.outs
    register_node_modules_linker(ctx, args, inputs)
    for a in ctx.attr.args:
        args.add(_expand_location(ctx, a))
    ctx.actions.run(
        executable = ctx.executable.tool,
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
    )
    return [DefaultInfo(files = depset(outputs))]

_npm_package_bin = rule(
    _impl,
    attrs = _ATTRS,
)

def npm_package_bin(tool = None, package = None, package_bin = None, data = [], outs = [], args = [], output_dir = False, **kwargs):
    """Run an arbitrary npm package binary (e.g. a program under node_modules/.bin/*) under Bazel.

    It must produce outputs. If you just want to run a program with `bazel run`, use the nodejs_binary rule.

    This is like a genrule() except that it runs our launcher script that first
    links the node_modules tree before running the program.

    This is a great candidate to wrap with a macro, as documented:
    https://docs.bazel.build/versions/master/skylark/macros.html#full-example

    Args:
        data: similar to [genrule.srcs](https://docs.bazel.build/versions/master/be/general.html#genrule.srcs)
              may also include targets that produce or reference npm packages which are needed by the tool
        outs: similar to [genrule.outs](https://docs.bazel.build/versions/master/be/general.html#genrule.outs)
        output_dir: set to True if you want the output to be a directory
                 Exactly one of `outs`, `output_dir` may be used.
                 If you output a directory, there can only be one output, which will be a directory named the same as the target.

        args: Command-line arguments to the tool.

            Subject to 'Make variable' substitution.
            Can use $(location) expansion. See https://docs.bazel.build/versions/master/be/make-variables.html
            You may also refer to the location of the output_dir with the special `$@` replacement, like genrule.
            If output_dir=False then $@ will refer to the output directory for this package.

        package: an npm package whose binary to run, like "terser". Assumes your node_modules are installed in a workspace called "npm"
        package_bin: the "bin" entry from `package` that should be run. By default package_bin is the same string as `package`
        tool: a label for a binary to run, like `@npm//terser/bin:terser`. This is the longer form of package/package_bin.
              Note that you can also refer to a binary in your local workspace.
    """
    if not tool:
        if not package:
            fail("You must supply either the tool or package attribute")
        if not package_bin:
            package_bin = package
        tool = "@npm//%s/bin:%s" % (package, package_bin)
    _npm_package_bin(
        data = data,
        outs = outs,
        args = args,
        output_dir = output_dir,
        tool = tool,
        **kwargs
    )
