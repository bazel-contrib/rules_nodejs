"A generic rule to run a tool that appears in node_modules/.bin"

load("//:providers.bzl", "JSModuleInfo", "NpmPackageInfo", "node_modules_aspect", "run_node")
load("//internal/common:expand_variables.bzl", "expand_variables")
load("//internal/linker:link_node_modules.bzl", "module_mappings_aspect")

# Note: this API is chosen to match nodejs_binary
# so that we can generate macros that act as either an output-producing tool or an executable
_ATTRS = {
    "args": attr.string_list(mandatory = True),
    "configuration_env_vars": attr.string_list(default = []),
    "data": attr.label_list(allow_files = True, aspects = [module_mappings_aspect, node_modules_aspect]),
    "output_dir": attr.bool(),
    "outs": attr.output_list(),
    "stderr": attr.output(),
    "stdout": attr.output(),
    "tool": attr.label(
        executable = True,
        cfg = "host",
        mandatory = True,
    ),
}

def _expand_locations(ctx, s):
    # `.split(" ")` is a work-around https://github.com/bazelbuild/bazel/issues/10309
    # _expand_locations returns an array of args to support $(execpaths) expansions.
    # TODO: If the string has intentional spaces or if one or more of the expanded file
    # locations has a space in the name, we will incorrectly split it into multiple arguments
    return ctx.expand_location(s, targets = ctx.attr.data).split(" ")

def _inputs(ctx):
    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the NpmPackageInfo provider.
    inputs_depsets = []
    for d in ctx.attr.data:
        if NpmPackageInfo in d:
            inputs_depsets.append(d[NpmPackageInfo].sources)
        if JSModuleInfo in d:
            inputs_depsets.append(d[JSModuleInfo].sources)
    return depset(ctx.files.data, transitive = inputs_depsets).to_list()

def _impl(ctx):
    if ctx.attr.output_dir and ctx.outputs.outs:
        fail("Only one of output_dir and outs may be specified")
    if not ctx.attr.output_dir and not ctx.outputs.outs and not ctx.attr.stdout:
        fail("One of output_dir, outs or stdout must be specified")

    args = ctx.actions.args()
    inputs = _inputs(ctx)
    outputs = []

    if ctx.attr.output_dir:
        outputs = [ctx.actions.declare_directory(ctx.attr.name)]
    else:
        outputs = ctx.outputs.outs

    for a in ctx.attr.args:
        args.add_all([expand_variables(ctx, e, outs = ctx.outputs.outs, output_dir = ctx.attr.output_dir) for e in _expand_locations(ctx, a)])

    tool_outputs = []
    if ctx.outputs.stdout:
        tool_outputs.append(ctx.outputs.stdout)

    if ctx.outputs.stderr:
        tool_outputs.append(ctx.outputs.stderr)

    run_node(
        ctx,
        executable = "tool",
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
        configuration_env_vars = ctx.attr.configuration_env_vars,
        stdout = ctx.outputs.stdout,
        stderr = ctx.outputs.stderr,
    )

    return [DefaultInfo(files = depset(outputs + tool_outputs))]

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
        stderr: set to capture the stderr of the binary to a file, which can later be used as an input to another target
                subject to the same semantics as `outs`
        stdout: set to capture the stdout of the binary to a file, which can later be used as an input to another target
                subject to the same semantics as `outs`

        args: Command-line arguments to the tool.

            Subject to 'Make variable' substitution. See https://docs.bazel.build/versions/master/be/make-variables.html.

            1. Predefined source/output path substitions is applied first:

            See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables.

            Use $(execpath) $(execpaths) to expand labels to the execroot (where Bazel runs build actions).

            Use $(rootpath) $(rootpaths) to expand labels to the runfiles path that a built binary can use
            to find its dependencies.

            Since npm_package_bin is used primarily for build actions, in most cases you'll want to
            use $(execpath) or $(execpaths) to expand locations.

            Using $(location) and $(locations) expansions is not recommended as these are a synonyms
            for either $(execpath) or $(rootpath) depending on the context.

            2. "Make" variables are expanded second:

            Predefined "Make" variables such as $(COMPILATION_MODE) and $(TARGET_CPU) are expanded.
            See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_variables.

            Like genrule, you may also use some syntax sugar for locations.

            - `$@`: if you have only one output file, the location of the output
            - `$(@D)`: The output directory. If output_dir=False and there is only one file name in outs, this expands to the directory
                containing that file. If there are multiple files, this instead expands to the package's root directory in the genfiles
                tree, even if all generated files belong to the same subdirectory! If output_dir=True then this corresponds
                to the output directory which is the $(RULEDIR)/{target_name}.
            - `$(RULEDIR)`: the root output directory of the rule, corresponding with its package
                (can be used with output_dir=True or False)

            See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_genrule_variables.

            Custom variables are also expanded including variables set through the Bazel CLI with --define=SOME_VAR=SOME_VALUE.
            See https://docs.bazel.build/versions/master/be/make-variables.html#custom_variables.

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
