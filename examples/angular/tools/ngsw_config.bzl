"Angular service worker support (credits: https://github.com/marcus-sa)"

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

def ngsw_config(name, config, src, out = None, **kwargs):
    "Creates ngsw.json with service worker configuration and hashes for all source files"
    if not out:
        out = name

    ngsw_config_name = "%s_bin" % name

    nodejs_binary(
        name = ngsw_config_name,
        data = ["@npm//@angular/service-worker"],
        visibility = ["//visibility:private"],
        entry_point = "@npm//:node_modules/@angular/service-worker/ngsw-config.js",
    )

    cmd = """
mkdir -p $@
cp -R $(locations {TMPL_src})/. $@/
$(location :{TMPL_bin}) $@ $(location {TMPL_conf})
    """.format(
        TMPL_src = src,
        TMPL_bin = ngsw_config_name,
        TMPL_conf = config,
    )

    native.genrule(
        name = name,
        outs = [out],
        srcs = [src, config],
        tools = [":" + ngsw_config_name],
        cmd = cmd,
        **kwargs
    )
