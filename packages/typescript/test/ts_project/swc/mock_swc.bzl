"Mock swc transpiler macro"

load("@bazel_skylib//rules:copy_file.bzl", "copy_file")
load("@bazel_skylib//rules:write_file.bzl", "write_file")

def swc(name, srcs, js_outs, map_outs, **kwargs):
    for i, s in enumerate(srcs):
        copy_file(
            name = "_{}_{}_js".format(name, s),
            src = s,
            out = js_outs[i],
        )

        write_file(
            name = "_{}_{}_map".format(name, s),
            out = map_outs[i],
            content = ["""{"version":3,"sources":["%s"],"mappings":"AAAO,KAAK,CAAC","file":"in.js","sourcesContent":["fake"]}""" % s],
        )
