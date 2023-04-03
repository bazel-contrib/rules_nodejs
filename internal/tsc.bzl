load("@npm//typescript:index.bzl", _tsc = "tsc")

# Basic wrapper around tsc to replace tsc()
def tsc(name, srcs, deps = [], data = [], tsconfig = "//:tsconfig.json", **kwargs):
    outs = [s.replace(".ts", ".js") for s in srcs] + [s.replace(".ts", ".d.ts") for s in srcs]

    _tsc(
        name = name,
        args = [
            "-p",
            "$(execpath %s)" % tsconfig,
            "--declaration",
            "--outDir",
            "$(RULEDIR)",
        ],
        data = srcs + deps + data + [tsconfig],
        outs = outs,
        **kwargs
    )
