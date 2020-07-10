"""
Contrived rule for writing some content to a file using run_node
Tests that two run_node calls can be made from the same rule context, where each run_node call
uses a different executable (and therefore the content of the modules manifest file is different)
"""

load("//:providers.bzl", "run_node")

def _js_write_file_impl(ctx):
    run_node(
        ctx = ctx,
        executable = "_writer",
        mnemonic = "writer",
        inputs = [],
        arguments = [
            ctx.attr.content,
            ctx.outputs.out.path,
        ],
        outputs = [ctx.outputs.out],
    )

    run_node(
        ctx = ctx,
        executable = "_writer2",
        # mnemonic is left as None here to test the node_modules manifest writer handling None
        inputs = [],
        arguments = [
            ctx.attr.content,
            ctx.outputs.out2.path,
        ],
        outputs = [ctx.outputs.out2],
    )

    content_txt = ctx.actions.declare_file("content.txt")
    ctx.actions.write(
        output = content_txt,
        content = ctx.attr.content,
    )

    run_node(
        ctx = ctx,
        executable = "_clone",
        mnemonic = "cloner",
        # Pass inputs as a list.
        inputs = [content_txt],
        arguments = [
            content_txt.path,
            ctx.outputs.out3.path,
        ],
        outputs = [ctx.outputs.out3],
    )

    run_node(
        ctx = ctx,
        executable = "_clone",
        mnemonic = "cloner",
        # Pass inputs as a depset.
        inputs = depset(direct = [content_txt]),
        arguments = [
            content_txt.path,
            ctx.outputs.out4.path,
        ],
        outputs = [ctx.outputs.out4],
    )

js_write_file = rule(
    implementation = _js_write_file_impl,
    outputs = {
        "out": "out.txt",
        "out2": "out2.txt",
        "out3": "out3.txt",
        "out4": "out4.txt",
    },
    attrs = {
        "content": attr.string(),
        "_clone": attr.label(
            default = Label("//internal/providers/test:cloner_bin"),
            cfg = "host",
            executable = True,
        ),
        "_writer": attr.label(
            default = Label("//internal/providers/test:writer_bin"),
            cfg = "host",
            executable = True,
        ),
        "_writer2": attr.label(
            default = Label("//internal/providers/test:writer_bin2"),
            cfg = "host",
            executable = True,
        ),
    },
)
