"checked_in_ts_project rule"

load("@build_bazel_rules_nodejs//internal/golden_file_test:golden_file_test.bzl", "golden_file_test")
load("@build_bazel_rules_nodejs//third_party/github.com/bazelbuild/bazel-skylib:rules/write_file.bzl", "write_file")
load("//packages/typescript:index.bzl", "ts_project")

def checked_in_ts_project(name, src, checked_in_js = None, **kwargs):
    """
    In rules_nodejs "builtin" package, we are creating the toolchain for building
    tsc-wrapped and executing ts_library, so we cannot depend on them.
    However, we still want to be able to write our tooling in TypeScript.
    This macro lets us check in the resulting .js files, and still ensure that they are
    compiled from the .ts by using a golden file test.
    """
    if not checked_in_js:
        checked_in_js = src[:-3] + ".js"

    tsconfig = "tsconfig_%s.json" % name

    # workspace is up three dirs (bazel-out/arch/bin) plus number of segments in the package
    workspace_root = "/".join([".."] * (3 + len(native.package_name().split("/"))))

    # Generate a tsconfig, this is partly an example of how it can be done, per jbedard and toxicable request
    write_file(
        name = "_gen_tsconfig_%s" % name,
        content = [struct(
            compilerOptions = struct(
                lib = ["es2017", "dom"],
                strict = True,
                target = "es2015",
                module = "commonjs",
                removeComments = True,
                declaration = True,
                skipLibCheck = True,
            ),
            files = ["/".join([workspace_root, native.package_name(), src])],
        ).to_json()],
        out = tsconfig,
    )

    ts_project(
        name = name,
        srcs = [src],
        declaration = True,
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
    golden_file_test(
        name = "%s_check_compiled" % name,
        actual = "_%s_no_format.js" % name,
        golden = checked_in_js,
    )
