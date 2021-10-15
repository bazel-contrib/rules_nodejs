"Implementation of pkg_npm rules."

load("@bazel_skylib//lib:paths.bzl", "paths")
load("@rules_nodejs//nodejs:providers.bzl", "LinkablePackageInfo")

# Hints for Bazel spawn strategy
_execution_requirements = {
    # Copying files is entirely IO-bound and there is no point doing this work remotely.
    # Also, remote-execution does not allow source directory inputs, see
    # https://github.com/bazelbuild/bazel/commit/c64421bc35214f0414e4f4226cc953e8c55fa0d2
    # So we must not attempt to execute remotely in that case.
    "no-remote-exec": "1",
}

def _dst_path(ctx, src, dst, remap_paths):
    flat_path = src.path if src.is_source else "/".join(src.path.split("/")[3:])
    dst_path = flat_path
    for k, v in remap_paths.items():
        k = k.strip()
        v = v.strip().strip("/")
        if not k:
            fail("invalid empty key in remap_paths")

        # determine if it is path relative to the current package
        is_relative = not k.startswith("/")
        k = k.strip("/")

        # allow for relative paths expressed with ./path
        if k.startswith("./"):
            k = k[2:]

        # if relative add the package name to the path
        if is_relative and ctx.label.package:
            k = "/".join([ctx.label.package, k])

        # if flat_path starts with key then substitute key for value
        if flat_path.startswith(k):
            dst_path = v + flat_path[len(k):] if v else flat_path[len(k) + 1:]
    return dst.path + "/" + dst_path

def _copy_bash(ctx, srcs, dst):
    cmds = [
        "set -o errexit -o nounset -o pipefail",
        "mkdir -p \"%s\"" % dst.path,
    ]
    for src in srcs:
        dst_path = _dst_path(ctx, src, dst, ctx.attr.remap_paths)
        cmds.append("""
if [[ ! -e "{src}" ]]; then echo "file '{src}' does not exist"; exit 1; fi
if [[ -f "{src}" ]]; then
    mkdir -p "{dst_dir}"
    cp -f "{src}" "{dst}"
else
    mkdir -p "{dst}"
    cp -rf "{src}/" "{dst}"
fi
""".format(src = src.path, dst_dir = paths.dirname(dst_path), dst = dst_path))
        # print("%s -> %s" % (src.path, dst_path))

    ctx.actions.run_shell(
        inputs = srcs,
        outputs = [dst],
        command = "\n".join(cmds),
        mnemonic = "PkgNpm",
        progress_message = "Copying files to pkg_npm directory",
        use_default_shell_env = True,
        execution_requirements = _execution_requirements,
    )

def _pkg_npm_impl(ctx):
    package_name = ctx.attr.package_name.strip()
    if not package_name:
        fail("package_name attr must not be empty")
    output = ctx.actions.declare_directory(package_name)
    if ctx.attr.is_windows:
        fail("not yet implemented")
    else:
        _copy_bash(ctx, ctx.files.srcs, output)
    files = depset(direct = [output])
    runfiles = ctx.runfiles(
        files = [output],
        transitive_files = depset([output]),
        root_symlinks = {
            "node_modules/" + package_name: output,
        },
    )
    for dep in ctx.attr.deps:
        runfiles = runfiles.merge(dep[DefaultInfo].data_runfiles)
    return [
        DefaultInfo(files = files, runfiles = runfiles),
        LinkablePackageInfo(package_name = ctx.attr.package_name, files = [output]),
    ]

_ATTRS = {
    "srcs": attr.label_list(mandatory = True, allow_files = True),
    "deps": attr.label_list(),
    "package_name": attr.string(mandatory = True),
    "remap_paths": attr.string_dict(),
    "is_windows": attr.bool(mandatory = True),
}

_pkg_npm = rule(
    implementation = _pkg_npm_impl,
    provides = [DefaultInfo],
    attrs = _ATTRS,
)

def pkg_npm(name, srcs, remap_paths = {}, **kwargs):
    """Copies all source files to an an output directory.

    NB: This rule is not yet tested on Windows

    Args:
      name: Name of the rule.
      srcs: List of files and/or directories to copy.
      remap_paths: Path mappings from source to destination
      **kwargs: further keyword arguments, e.g. `visibility`
    """
    _pkg_npm(
        name = name,
        srcs = srcs,
        remap_paths = remap_paths,
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )
