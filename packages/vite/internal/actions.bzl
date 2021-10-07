"""
vite actions
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "run_node")

def vite_build_action(ctx, srcs, out):
    """
    run a production build of the vite project
    """

    # setup the args passed to vite
    launcher_args = ctx.actions.args()

    launcher_args.add_all([
        "build",
        # "-l",
        # "info",
        "--minify",
        "esbuild",
        "--outDir",
        out.path,
    ])

    outputs = []
    outputs.append(out)

    execution_requirements = {}
    if "no-remote-exec" in ctx.attr.tags:
        execution_requirements = {"no-remote-exec": "1"}

    run_node(
        ctx = ctx,
        inputs = depset(srcs),
        outputs = outputs,
        arguments = [launcher_args],
        execution_requirements = execution_requirements,
        mnemonic = "vite",
        executable = "vite",
        link_workspace_root = True,
    )
