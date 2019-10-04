"test fixture"

def _produces_js_as_defaultinfo(ctx):
    return DefaultInfo(files = depset(ctx.files.srcs))

produces_js_as_defaultinfo = rule(
    _produces_js_as_defaultinfo,
    attrs = {"srcs": attr.label_list(allow_files = True)},
)
