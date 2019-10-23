"Illustrates how a reusable high-level workflow can be assembled from individual tools"

# TODO(alexeagle): promote web_package rule to the public API
load("@build_bazel_rules_nodejs//internal/web_package:web_package.bzl", "web_package")
load("@npm_bazel_rollup//:index.bzl", "rollup_bundle")
load("@npm_bazel_terser//:index.bzl", "terser_minified")
load("@npm_bazel_typescript//:index.bzl", "ts_library")
load("@npm//@babel/cli/bin", "babel")

def differential_loading(name, entry_point, srcs):
    "Common workflow to serve TypeScript to modern browsers"

    ts_library(
        name = name + "_lib",
        srcs = srcs,
    )

    rollup_bundle(
        name = name + "_chunks",
        deps = [name + "_lib"],
        sourcemap = "inline",
        entry_points = {
            entry_point: "index",
        },
        output_dir = True,
    )

    # For older browsers, we'll transform the output chunks to es5 + systemjs loader
    babel(
        name = name + "_chunks_es5",
        data = [
            name + "_chunks",
            "es5.babelrc",
            "@npm//@babel/preset-env",
        ],
        output_dir = True,
        args = [
            "$(location %s_chunks)" % name,
            "--config-file",
            "$(location es5.babelrc)",
            "--out-dir",
            "$@",
        ],
    )

    # Run terser against both modern and legacy browser chunks
    terser_minified(
        name = name + "_chunks_es5.min",
        src = name + "_chunks_es5",
    )

    terser_minified(
        name = name + "_chunks.min",
        src = name + "_chunks",
    )

    web_package(
        name = name,
        assets = [
            "styles.css",
        ],
        data = [
            "favicon.png",
            name + "_chunks.min",
            name + "_chunks_es5.min",
        ],
        index_html = "index.html",
    )
