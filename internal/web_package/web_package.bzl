def html_asset_inject(index_html, action_factory, injector, assets, output):
    args = action_factory.args()
    args.add(output.path)
    args.add(index_html.path)
    args.add_all(assets)
    args.use_param_file("%s", use_always = True)
    action_factory.run(
        inputs = [index_html],
        outputs = [output],
        executable = injector,
        arguments = [args],
    )
    return output

def move_files(output_name, files, action_factory, assembler):
    www_dir = action_factory.declare_directory(output_name)
    args = action_factory.args()
    args.add(www_dir.path)
    args.add_all([f.path for f in files])
    args.use_param_file("%s", use_always = True)
    action_factory.run(
        inputs = files,
        outputs = [www_dir],
        executable = assembler,
        arguments = [args],
        execution_requirements = {"local": "1"},
    )
    return depset([www_dir])

def _web_package(ctx):
    html = ctx.actions.declare_file("index.html")
    populated_index = html_asset_inject(
        ctx.file.index_html,
        ctx.actions,
        ctx.executable._injector,
        [f.path for f in ctx.files.assets],
        html,
    )
    package_layout = move_files(
        ctx.label.name,
        ctx.files.data + ctx.files.assets + [html],
        ctx.actions,
        ctx.executable._assembler,
    )
    return [
        DefaultInfo(files = package_layout),
    ]

web_package = rule(
    implementation = _web_package,
    attrs = {
        "assets": attr.label_list(
            allow_files = True,
            doc = """Files which should be referenced from the index_html""",
        ),
        "data": attr.label_list(
            allow_files = True,
            doc = """Additional files which should be served on request""",
        ),
        "index_html": attr.label(
            allow_single_file = True,
            doc = """The entry point of the application""",
        ),
        "_assembler": attr.label(
            default = "@build_bazel_rules_nodejs//internal/web_package:assembler",
            executable = True,
            cfg = "host",
        ),
        "_injector": attr.label(
            default = "@build_bazel_rules_nodejs//internal/web_package:injector",
            executable = True,
            cfg = "host",
        ),
    },
)
"""
Assembles a web application from source files.

Injects JS and CSS resources into the index.html.
"""
