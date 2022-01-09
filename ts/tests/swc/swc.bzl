"Fixture to demonstrate a custom transpiler for ts_project"

load("@bazel_skylib//rules:copy_file.bzl", "copy_file")
load("@bazel_skylib//rules:write_file.bzl", "write_file")
load("@bazel_skylib//lib:partial.bzl", "partial")

_DUMMY_SOURCEMAP = """{"version":3,"sources":["%s"],"mappings":"AAAO,KAAK,CAAC","file":"in.js","sourcesContent":["fake"]}"""

def swc_macro(name, srcs, js_outs, map_outs, **kwargs):
    """Mock swc transpiler macro.

    In real usage you would wrap a rule like
    https://github.com/aspect-build/rules_swc/blob/main/docs/swc.md
    """

    for i, s in enumerate(srcs):
        copy_file(
            name = "_{}_{}_js".format(name, s),
            src = s,
            out = js_outs[i],
        )

        write_file(
            name = "_{}_{}_map".format(name, s),
            out = map_outs[i],
            content = [_DUMMY_SOURCEMAP % s],
        )

# In Bazel 5, we could use a lambda to build a higher-order function
# but for Bazel 4 and below, we need partials.
def swc(args = [], swcrc = None):
    return partial.make(swc_macro, args = args, swcrc = swcrc)
