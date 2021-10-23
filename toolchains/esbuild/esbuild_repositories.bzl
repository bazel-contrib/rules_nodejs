"""
Helper macro for fetching esbuild versions
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@build_bazel_rules_nodejs//:index.bzl", "npm_install")
load(":esbuild_packages.bzl", "ESBUILD_PACKAGES")

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

def esbuild_repositories(name = "", npm_repository = "npm"):
    """Helper for fetching and setting up the esbuild versions and toolchains

    This uses Bazel's downloader (via `http_archive`) to fetch the esbuild package
    from npm, separately from any `npm_install`/`yarn_install` in your WORKSPACE.
    To configure where the download is from, you make a file containing a rewrite rule like

        rewrite (registry.nodejs.org)/(.*) artifactory.build.internal.net/artifactory/$1/$2

    You can find some documentation on the rewrite patterns in the Bazel sources:
    [UrlRewriterConfig.java](https://github.com/bazelbuild/bazel/blob/4.2.1/src/main/java/com/google/devtools/build/lib/bazel/repository/downloader/UrlRewriterConfig.java#L66)

    Then use the `--experimental_downloader_config` Bazel option to point to your file.
    For example if you created `.bazel_downloader_config` you might add to your `.bazelrc` file:

        common --experimental_downloader_config=.bazel_downloader_config

    Args:
        name: currently unused
        npm_repository:  the name of the repository where the @bazel/esbuild package is installed
            by npm_install or yarn_install.
    """

    for name, meta in ESBUILD_PACKAGES.platforms.items():
        _maybe(
            http_archive,
            name = "esbuild_%s" % name,
            urls = meta.urls,
            strip_prefix = "package",
            build_file_content = """exports_files(["%s"])""" % meta.binary_path,
            sha256 = meta.sha,
        )

        toolchain_label = Label("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_%s_toolchain" % name)
        native.register_toolchains("@%s//%s:%s" % (toolchain_label.workspace_name, toolchain_label.package, toolchain_label.name))

    # When used from our distribution, the toolchain in rules_nodejs needs to point out to the
    # @bazel/esbuild package where it was installed by npm_install so that our launcher.js can
    # require('esbuild') via the multi-linker.
    pkg_label = Label("@%s//packages/esbuild:esbuild.bzl" % npm_repository)
    package_path = "external/" + pkg_label.workspace_name + "/@bazel/esbuild"

    # BEGIN-INTERNAL
    # But when used within rules_nodejs locally from source, it's linked next to the launcher.js source
    package_path = "packages/esbuild"

    # END-INTERNAL
    npm_install(
        name = "esbuild_npm",
        package_json = Label("@build_bazel_rules_nodejs//toolchains/esbuild:package.json"),
        package_lock_json = Label("@build_bazel_rules_nodejs//toolchains/esbuild:package-lock.json"),
        args = [
            # Install is run with no-optional so that esbuild's optional dependencies are not installed.
            # We never use the downloaded binary anyway and instead set 'ESBUILD_BINARY_PATH' to the toolchains path.
            # This allows us to deal with --platform
            "--no-optional",
            # Disable scripts as we don't need the javascript shim replaced wit the binary.
            "--ignore-scripts",
        ],
        symlink_node_modules = False,
        package_path = package_path,
    )
