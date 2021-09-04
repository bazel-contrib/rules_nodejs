"Shows how to define a bazel rule that runs its action as a persistent worker."

def _work(ctx):
    output = ctx.actions.declare_file(ctx.label.name + ".json")

    # Bazel workers always get their arguments spilled into a params file
    args = ctx.actions.args()

    # Bazel requires a flagfile for worker mode,
    # either prefixed with @ or --flagfile= argument
    args.use_param_file("@%s", use_always = True)
    args.set_param_file_format("multiline")

    args.add(output.path)

    ctx.actions.run(
        arguments = [args],
        executable = ctx.executable.tool,
        inputs = [ctx.file.src],
        outputs = [output],
        # Tell Bazel that this program speaks the worker protocol
        execution_requirements = {"supports-workers": "1"},
        # The user can explicitly set the execution strategy
        mnemonic = "DoWork",
        env = {"COMPILATION_MODE": ctx.var["COMPILATION_MODE"]},
    )

    return [DefaultInfo(files = depset([output]))]

work = rule(
    implementation = _work,
    attrs = {
        "src": attr.label(allow_single_file = True),
        "tool": attr.label(
            default = Label("//packages/worker/test/work:tool"),
            executable = True,
            cfg = "host",
        ),
    },
)
