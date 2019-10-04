"test fixure"

def _produces_js_as_defaultinfo(ctx):
    return DefaultInfo(files = depset([ctx.file.src]))

produces_js_as_defaultinfo = rule(
    _produces_js_as_defaultinfo,
    attrs = {"src": attr.label(allow_single_file = True)},
)
