"""
Next.js-related macros.
"""

load("@build_bazel_rules_nodejs//:index.bzl", "copy_to_bin", "npm_package_bin")
load("@npm//next:index.bzl", "next")
load(":expand_template.bzl", "expand_template")

_bzl_opts = [
    "--node_options=--preserve-symlinks-main",
    "--bazel_run_from_execroot",
]

def nextjs(name, deps = [], visibility = ["//visibility:public"]):
    """Macro generating multiple rules for NextJS.

    A rule with the specified name builds the application, where a rule
    with ${name}.dev starts the dev server. Note that the dev server should
    be started with ibazel so that file additions can be properly detected.

    Args:
        name: The name to use for the generated rules.
        deps: Dependencies.
        visibility: The visibility of the resulting targets (next.js output dir and public files).
    """
    inputs = "%s-srcs" % name
    native.filegroup(name = inputs, srcs = native.glob(["pages/**"]))

    native.filegroup(
        name = "public_files",
        srcs = native.glob(["public/**"]),
        visibility = visibility,
    )

    # Configure the Next.js application.
    # Use expand_template() as a copy mechanism, since
    # copy_to_bin doesn't allow non-src files to be copied.
    cfg = "%s-cfg" % name
    expand_template(
        name = cfg,
        template = ":next.config.js.template",
        substitutions = {
            "TEMPLATED_output_dir": name,
        },
        out = "next.config.js",
    )

    bin_inputs = "%s-bin" % name
    copy_to_bin(name = bin_inputs, srcs = [inputs])

    # Rule to build the application.
    npm_package_bin(
        name = name,
        package = "next",
        data = [
            bin_inputs,
            cfg,
        ] + deps,
        output_dir = True,
        args = ["build", "$(RULEDIR)"] + _bzl_opts,
        visibility = visibility,
    )

    # Rule to run the Next.js development server.
    next(
        name = name + ".dev",
        data = [
            inputs,
            cfg,
            "public_files",
        ] + deps,
        templated_args = ["dev", native.package_name()] + _bzl_opts,
        tags = ["ibazel_notify_changes"],
    )
