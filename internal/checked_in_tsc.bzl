"checked_in_tsc rule"

load("@build_bazel_rules_nodejs//:index.bzl", "generated_file_test")
load("//internal:tsc.bzl", "tsc")

def checked_in_tsc(name, src, checked_in_js = None, tsconfig = None, **kwargs):
    """A tsc rule that also asserts that the generated JS is up-to-date."""
    if not checked_in_js:
        checked_in_js = src[:-3] + ".js"

    if tsconfig == None:
        tsconfig = "//:tsconfig.json"

    tsc(
        name = name,
        srcs = [src],
        tsconfig = tsconfig,
        **kwargs
    )

    # Don't trigger clang-format on the output js
    # Make sure we don't add any lines though, since that would
    # break the sourcemap
    native.genrule(
        name = "_%s_skip_formatting" % name,
        srcs = [src.replace(".ts", ".js")],
        outs = ["_%s_no_format.js" % name],
        cmd = """echo -n "/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */" > $@; cat $< >> $@""",
    )

    # Assert that we kept the index.js up-to-date when changing the TS code
    generated_file_test(
        name = "%s_check_compiled" % name,
        generated = "_%s_no_format.js" % name,
        src = checked_in_js,
    )
