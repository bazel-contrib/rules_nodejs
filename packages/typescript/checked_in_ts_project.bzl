"checked_in_ts_project rule"

load("@build_bazel_rules_nodejs//:index.bzl", "generated_file_test")
load("//packages/typescript:index.bzl", "ts_project")

def checked_in_ts_project(name, src, checked_in_js = None, tsconfig = None, **kwargs):
    """
    In rules_nodejs "builtin" package, we are creating the toolchain for building
    tsc-wrapped and executing ts_project, so we cannot depend on them.
    However, we still want to be able to write our tooling in TypeScript.
    This macro lets us check in the resulting .js files, and still ensure that they are
    compiled from the .ts by using a golden file test.
    """
    if not checked_in_js:
        checked_in_js = src[:-3] + ".js"

    if tsconfig == None:
        tsconfig = {
            "compilerOptions": {
                "declaration": True,
                "lib": ["es2017", "dom"],
                "module": "commonjs",
                "removeComments": True,
                "skipLibCheck": True,
                "strict": True,
                "target": "es2015",
            },
        }

    ts_project(
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
        srcs = [name],
        outs = ["_%s_no_format.js" % name],
        cmd = """echo -n "/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */" > $@; cat $< >> $@""",
    )

    # Assert that we kept the index.js up-to-date when changing the TS code
    generated_file_test(
        name = "%s_check_compiled" % name,
        generated = "_%s_no_format.js" % name,
        src = checked_in_js,
    )
