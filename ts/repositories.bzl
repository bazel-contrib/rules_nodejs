"Fetches needed to run the typescript compiler"

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def ts_repositories():
    http_archive(
        name = "npm_typescript-4.3.5",
        build_file_content = """
load("@rules_nodejs//third_party/github.com/bazelbuild/bazel-skylib:rules/copy_file.bzl", "copy_file")

# Turn a source directory into a TreeArtifact for RBE-compat
copy_file(
    name = "npm_typescript-4.3.5",
    src = "package",
    # This attribute comes from rules_nodejs patch of
    # https://github.com/bazelbuild/bazel-skylib/pull/323
    is_directory = True,
    # We must give this as the directory in order for it to appear on NODE_PATH
    out = "package",
    visibility = ["//visibility:public"],
)
""",
        sha256 = "c7be550da858be7abfc73dd0b9060ab23ce835ae3b05931f4500a25c09766d45",
        urls = ["https://registry.npmjs.org/typescript/-/typescript-4.3.5.tgz"],
    )
