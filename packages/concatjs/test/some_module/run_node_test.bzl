"""Contrived custom rule for writing some content to a file using run_node"""

load("//:providers.bzl", "run_node")

def _ts_write_file_impl(ctx):
    run_node(
        ctx = ctx,
        executable = "_writer",
        inputs = [],
        arguments = [
            ctx.attr.content,
            ctx.outputs.out.path,
        ],
        outputs = [ctx.outputs.out],
    )

ts_write_file = rule(
    implementation = _ts_write_file_impl,
    outputs = {
        "out": "out.txt",
    },
    attrs = {
        "content": attr.string(),
        "_writer": attr.label(
            default = Label("//packages/concatjs/test/some_module:writer_bin"),
            cfg = "exec",
            executable = True,
        ),
    },
)
