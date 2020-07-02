"Generate a folder"

def _gen_folder_impl(ctx):
    "Generate a folder"
    folder = ctx.actions.declare_directory(ctx.attr.out)
    ctx.actions.run_shell(
        outputs = [folder],
        command = """
      mkdir {path}
      echo 1 > {path}/1.txt
      echo 2 > {path}/2.txt
      """.format(path = folder.path),
    )
    return [DefaultInfo(files = depset([folder]))]

gen_folder = rule(
    implementation = _gen_folder_impl,
    attrs = {
        "out": attr.string(mandatory = True, doc = "folder name"),
    },
)
