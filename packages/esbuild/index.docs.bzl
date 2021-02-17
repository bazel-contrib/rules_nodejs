"""This contains references to the symbols we want documented.
"""

load(
    "@build_bazel_rules_nodejs//packages/esbuild:esbuild.bzl",
    _esbuild = "esbuild",
)

esbuild = _esbuild

# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn stardoc to re-generate the docsite.
